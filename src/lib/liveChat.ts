import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SenderRole = 'visitor' | 'team';
export type DeliveryStatus = 'sent' | 'delivered' | 'read';

export type LiveChatMessage = {
  id: string;
  conversation_id: string;
  sender_role: SenderRole;
  body: string;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  status: DeliveryStatus;
  created_at: string;
};

export type LiveChatConversation = {
  id: string;
  visitor_name: string;
  created_at: string;
  last_message_at: string;
};

export type OutgoingAttachment = { path: string; name: string; type: string; size: number };

export const MAX_LIVE_CHAT_BODY = 2000;
export const ATTACHMENT_LIMIT_BYTES = 5 * 1024 * 1024;
export const CHAT_MEDIA_BUCKET = 'chat-media';

const TOKEN_STORAGE_KEY = 'cca-live-chat-token';
const TOKEN_MIN_LENGTH = 32;
const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.';
const ATTACHMENT_EXTENSIONS = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['application/pdf', 'pdf'],
]);

export function validateAttachmentFile(file: File): string | null {
  if (!ATTACHMENT_EXTENSIONS.has(file.type)) return 'Please choose a PNG, JPEG, WebP, GIF or PDF file.';
  if (file.size > ATTACHMENT_LIMIT_BYTES) return 'Files must be 5 MB or smaller.';
  return null;
}

export function getVisitorToken(): string {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored && stored.length >= TOKEN_MIN_LENGTH) return stored;
    const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return token;
  } catch {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`;
  }
}

export function attachmentUrl(path: string): string {
  return supabase.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadChatAttachment(file: File): Promise<OutgoingAttachment> {
  const extension = ATTACHMENT_EXTENSIONS.get(file.type);
  if (!extension) throw new Error('Unsupported file type.');
  const path = `uploads/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (error) throw new Error(GENERIC_ERROR);
  return { path, name: file.name.slice(0, 200), type: file.type, size: file.size };
}

function toMessages(data: unknown): LiveChatMessage[] {
  return Array.isArray(data) ? (data as LiveChatMessage[]) : [];
}

export async function fetchVisitorMessages(token: string): Promise<LiveChatMessage[]> {
  const { data, error } = await supabase.rpc('chat_visitor_fetch', { p_token: token });
  if (error) throw new Error(GENERIC_ERROR);
  return toMessages(data);
}

export async function sendVisitorMessage(
  token: string,
  body: string,
  attachment: OutgoingAttachment | null,
): Promise<void> {
  const { error } = await supabase.rpc('chat_visitor_send', {
    p_token: token,
    p_body: body,
    p_attachment_path: attachment?.path ?? null,
    p_attachment_name: attachment?.name ?? null,
    p_attachment_type: attachment?.type ?? null,
    p_attachment_size: attachment?.size ?? null,
  });
  if (error) throw new Error(GENERIC_ERROR);
}

export async function fetchLiveConversations(): Promise<LiveChatConversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('id, visitor_name, created_at, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(GENERIC_ERROR);
  return (data ?? []) as LiveChatConversation[];
}

export async function fetchConversationMessages(conversationId: string): Promise<LiveChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(GENERIC_ERROR);
  return (data ?? []) as LiveChatMessage[];
}

export async function markAllVisitorMessagesDelivered(): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('sender_role', 'visitor')
    .eq('status', 'sent');
  if (error) throw new Error(GENERIC_ERROR);
}

export async function markVisitorMessagesRead(conversationId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('chat_messages')
    .update({ status: 'read', delivered_at: now, read_at: now })
    .eq('conversation_id', conversationId)
    .eq('sender_role', 'visitor')
    .neq('status', 'read');
  if (error) throw new Error(GENERIC_ERROR);
}

export async function sendTeamMessage(
  conversationId: string,
  body: string,
  attachment: OutgoingAttachment | null,
): Promise<void> {
  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    sender_role: 'team',
    body,
    attachment_path: attachment?.path ?? null,
    attachment_name: attachment?.name ?? null,
    attachment_type: attachment?.type ?? null,
    attachment_size: attachment?.size ?? null,
  });
  if (error) throw new Error(GENERIC_ERROR);
}

export type TypingChannel = {
  notifyTyping: () => void;
  close: () => void;
};

export function openTypingChannel(
  conversationId: string,
  role: SenderRole,
  onRemoteTyping: () => void,
): TypingChannel {
  const channel: RealtimeChannel = supabase.channel(`live-chat-typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });
  channel
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload?.role !== role) onRemoteTyping();
    })
    .subscribe();
  return {
    notifyTyping: () => {
      void channel.send({ type: 'broadcast', event: 'typing', payload: { role } });
    },
    close: () => {
      void supabase.removeChannel(channel);
    },
  };
}
