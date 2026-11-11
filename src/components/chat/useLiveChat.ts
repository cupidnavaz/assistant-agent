import { useCallback, useEffect, useState } from 'react';
import {
  MAX_LIVE_CHAT_BODY,
  fetchVisitorMessages,
  getVisitorToken,
  sendVisitorMessage,
  uploadChatAttachment,
  validateAttachmentFile,
  type LiveChatMessage,
  type OutgoingAttachment,
} from '@/lib/liveChat';
import { useTypingPresence } from '@/hooks/useTypingPresence';

const POLL_INTERVAL_MS = 3000;
const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.';

export function useLiveChat() {
  const [token] = useState(getVisitorToken);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { isRemoteTyping, notifyTyping } = useTypingPresence(conversationId, 'visitor');

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchVisitorMessages(token);
      setMessages(rows);
      setConversationId(rows[0]?.conversation_id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const deliver = useCallback(
    async (body: string, attachment: OutgoingAttachment | null) => {
      setIsSending(true);
      setError(null);
      try {
        await sendVisitorMessage(token, body, attachment);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : GENERIC_ERROR);
      } finally {
        setIsSending(false);
      }
    },
    [token, refresh],
  );

  const sendText = useCallback(
    (text: string) => {
      const body = text.trim().slice(0, MAX_LIVE_CHAT_BODY);
      if (!body || isSending) return;
      void deliver(body, null);
    },
    [isSending, deliver],
  );

  const sendFile = useCallback(
    async (file: File) => {
      const problem = validateAttachmentFile(file);
      if (problem) {
        setError(problem);
        return;
      }
      setIsSending(true);
      setError(null);
      try {
        const attachment = await uploadChatAttachment(file);
        await sendVisitorMessage(token, '', attachment);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : GENERIC_ERROR);
      } finally {
        setIsSending(false);
      }
    },
    [token, refresh],
  );

  return { messages, isRemoteTyping, error, isSending, sendText, sendFile, notifyTyping, retry: refresh };
}
