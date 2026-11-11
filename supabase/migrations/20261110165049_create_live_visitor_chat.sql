/*
# Live visitor chat with team replies

1. New Tables
- `chat_conversations`: one row per website visitor. Stores a hash of the visitor's private key, never the key itself, and the time of the last message.
- `chat_messages`: messages in a conversation, from the visitor or the team. Holds text, an optional attachment reference, and a delivery status (sent, delivered, read).

2. Storage
- New private bucket `chat-media` for visitor and team attachments. Accepts PNG, JPEG, WebP, GIF and PDF up to 5 MB.

3. Security
- Visitors have no direct table access. They use two functions that check their private key: one sends a message and one loads the conversation.
- Signed-in team members with lead view permission can read conversations and messages, reply, and mark visitor messages as read.
- Only team members with lead view permission can change message status.
- Visitor uploads are limited by file type and size at the storage bucket.

4. Important notes
- Safe to re-run.
- Message status moves from sent to delivered when the other side loads it, then to read when it is viewed.
*/

CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_token_hash bytea NOT NULL UNIQUE,
  visitor_name text NOT NULL DEFAULT 'Visitor' CHECK (char_length(visitor_name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('visitor', 'team')),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  attachment_path text CHECK (attachment_path IS NULL OR char_length(attachment_path) <= 300),
  attachment_name text CHECK (attachment_name IS NULL OR char_length(attachment_name) <= 200),
  attachment_type text CHECK (
    attachment_type IS NULL OR attachment_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf')
  ),
  attachment_size integer CHECK (attachment_size IS NULL OR attachment_size BETWEEN 1 AND 5242880),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  CHECK (char_length(btrim(body)) > 0 OR attachment_path IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON public.chat_messages (conversation_id, created_at);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chat_conversations FROM anon, authenticated;
REVOKE ALL ON public.chat_messages FROM anon, authenticated;

GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT INSERT (conversation_id, sender_role, body, attachment_path, attachment_name, attachment_type, attachment_size) ON public.chat_messages TO authenticated;
GRANT UPDATE (status, delivered_at, read_at) ON public.chat_messages TO authenticated;

DROP POLICY IF EXISTS "team_select_conversations" ON public.chat_conversations;
CREATE POLICY "team_select_conversations" ON public.chat_conversations FOR SELECT
  TO authenticated USING (public.has_lead_permission('leads:view'));

DROP POLICY IF EXISTS "team_select_messages" ON public.chat_messages;
CREATE POLICY "team_select_messages" ON public.chat_messages FOR SELECT
  TO authenticated USING (public.has_lead_permission('leads:view'));

DROP POLICY IF EXISTS "team_insert_messages" ON public.chat_messages;
CREATE POLICY "team_insert_messages" ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_lead_permission('leads:view') AND sender_role = 'team');

DROP POLICY IF EXISTS "team_update_message_status" ON public.chat_messages;
CREATE POLICY "team_update_message_status" ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (public.has_lead_permission('leads:view') AND sender_role = 'visitor')
  WITH CHECK (public.has_lead_permission('leads:view') AND sender_role = 'visitor');

CREATE OR REPLACE FUNCTION public.chat_visitor_send(
  p_token text,
  p_body text,
  p_attachment_path text,
  p_attachment_name text,
  p_attachment_type text,
  p_attachment_size integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash bytea;
  v_conversation uuid;
  v_message uuid;
BEGIN
  IF char_length(coalesce(p_token, '')) NOT BETWEEN 32 AND 200 THEN
    RAISE EXCEPTION 'invalid chat session';
  END IF;
  v_hash := sha256(convert_to(p_token, 'UTF8'));

  INSERT INTO public.chat_conversations (visitor_token_hash)
  VALUES (v_hash)
  ON CONFLICT (visitor_token_hash) DO NOTHING;

  SELECT id INTO v_conversation FROM public.chat_conversations WHERE visitor_token_hash = v_hash;

  IF p_attachment_path IS NOT NULL AND p_attachment_path NOT LIKE 'uploads/%' THEN
    RAISE EXCEPTION 'invalid attachment';
  END IF;

  INSERT INTO public.chat_messages (
    conversation_id, sender_role, body, attachment_path, attachment_name, attachment_type, attachment_size
  )
  VALUES (
    v_conversation, 'visitor', coalesce(p_body, ''), p_attachment_path, p_attachment_name, p_attachment_type, p_attachment_size
  )
  RETURNING id INTO v_message;

  UPDATE public.chat_conversations SET last_message_at = now() WHERE id = v_conversation;
  RETURN v_message;
END;
$$;

CREATE OR REPLACE FUNCTION public.chat_visitor_fetch(p_token text)
RETURNS SETOF public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation uuid;
BEGIN
  IF char_length(coalesce(p_token, '')) NOT BETWEEN 32 AND 200 THEN
    RAISE EXCEPTION 'invalid chat session';
  END IF;

  SELECT id INTO v_conversation FROM public.chat_conversations
  WHERE visitor_token_hash = sha256(convert_to(p_token, 'UTF8'));
  IF v_conversation IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.chat_messages
  SET status = 'read', read_at = coalesce(read_at, now()), delivered_at = coalesce(delivered_at, now())
  WHERE conversation_id = v_conversation AND sender_role = 'team' AND status <> 'read';

  RETURN QUERY
  SELECT * FROM public.chat_messages WHERE conversation_id = v_conversation ORDER BY created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.chat_visitor_send(text, text, text, text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.chat_visitor_fetch(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chat_visitor_send(text, text, text, text, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_visitor_fetch(text) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media', 'chat-media', true, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "visitor_upload_chat_media" ON storage.objects;
CREATE POLICY "visitor_upload_chat_media" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = 'uploads');

DROP POLICY IF EXISTS "team_upload_chat_media" ON storage.objects;
CREATE POLICY "team_upload_chat_media" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND public.has_lead_permission('leads:view'));
