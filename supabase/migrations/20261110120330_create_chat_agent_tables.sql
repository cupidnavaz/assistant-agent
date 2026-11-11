/*
# Chat agent tables: leads, chat sessions, rate limits, admin access

1. New Tables
- `leads`: one row per potential customer captured by the chat assistant or the inline lead form.
  Columns: id, name, contact (email or phone), service, project_description, source (default 'chat-widget'), status (default 'new', one of new / contacted / won / lost), created_at.
- `chat_sessions`: one saved transcript per browser chat session (session_id, messages as JSON, created_at).
- `chat_rate_limits`: per-IP request counter per minute, used by the chat function to allow at most 10 requests per minute.
- `admin_emails`: the list of email addresses allowed to view and manage leads.

2. Functions
- `is_lead_admin()`: returns true when the signed-in user's email is in `admin_emails`.
- `increment_chat_rate_limit(ip)`: atomically counts a request for an IP in the current minute and returns the count. Old counter rows are cleaned up automatically.

3. Security
- Row level security is enabled on all four tables.
- Anonymous website visitors have no access to any of these tables. They only reach data through the chat function.
- The chat function (service role) can insert leads and save chat sessions.
- Signed-in admins listed in `admin_emails` can read leads and change a lead's status. Nothing else.
- The rate limit and admin check functions are not callable by anonymous visitors.

4. Important notes
- Admin emails are added separately by the owner (see admin_emails).
- Migration is safe to re-run.
*/

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text NOT NULL,
  service text NOT NULL,
  project_description text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'chat-widget',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
  ip text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (ip, window_start)
);

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

GRANT INSERT ON public.leads TO service_role;
GRANT SELECT ON public.leads TO authenticated;
GRANT UPDATE (status) ON public.leads TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_rate_limits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_emails TO service_role;

CREATE OR REPLACE FUNCTION public.is_lead_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_emails a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_lead_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lead_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_chat_rate_limit(p_ip text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window timestamptz := date_trunc('minute', now());
  v_hits integer;
BEGIN
  INSERT INTO public.chat_rate_limits AS r (ip, window_start, hits)
  VALUES (p_ip, v_window, 1)
  ON CONFLICT (ip, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;

  DELETE FROM public.chat_rate_limits WHERE window_start < now() - interval '1 hour';

  RETURN v_hits;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_chat_rate_limit(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_chat_rate_limit(text) TO service_role;

DROP POLICY IF EXISTS "admin_select_leads" ON public.leads;
CREATE POLICY "admin_select_leads" ON public.leads FOR SELECT
  TO authenticated USING (public.is_lead_admin());

DROP POLICY IF EXISTS "admin_update_lead_status" ON public.leads;
CREATE POLICY "admin_update_lead_status" ON public.leads FOR UPDATE
  TO authenticated USING (public.is_lead_admin()) WITH CHECK (public.is_lead_admin());
