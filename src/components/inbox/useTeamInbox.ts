import { useCallback, useEffect, useState } from 'react';
import {
  MAX_LIVE_CHAT_BODY,
  fetchConversationMessages,
  fetchLiveConversations,
  markAllVisitorMessagesDelivered,
  markVisitorMessagesRead,
  sendTeamMessage,
  uploadChatAttachment,
  validateAttachmentFile,
  type LiveChatConversation,
  type LiveChatMessage,
  type OutgoingAttachment,
} from '@/lib/liveChat';
import { useTypingPresence } from '@/hooks/useTypingPresence';

const LIST_POLL_INTERVAL_MS = 5000;
const THREAD_POLL_INTERVAL_MS = 3000;
const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.';

export function useTeamInbox() {
  const [conversations, setConversations] = useState<LiveChatConversation[]>([]);
  const [isListLoaded, setIsListLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const { isRemoteTyping, notifyTyping } = useTypingPresence(selectedId, 'team');

  const refreshConversations = useCallback(async () => {
    try {
      await markAllVisitorMessagesDelivered();
      setConversations(await fetchLiveConversations());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setIsListLoaded(true);
    }
  }, []);

  const refreshMessages = useCallback(async (conversationId: string) => {
    try {
      await markVisitorMessagesRead(conversationId);
      setMessages(await fetchConversationMessages(conversationId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
    const interval = window.setInterval(() => void refreshConversations(), LIST_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refreshConversations]);

  useEffect(() => {
    if (!selectedId) return;
    void refreshMessages(selectedId);
    const interval = window.setInterval(() => void refreshMessages(selectedId), THREAD_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [selectedId, refreshMessages]);

  const selectConversation = useCallback((conversationId: string | null) => {
    setSelectedId(conversationId);
    setMessages([]);
  }, []);

  const deliver = useCallback(
    async (conversationId: string, body: string, attachment: OutgoingAttachment | null) => {
      setIsSending(true);
      setError(null);
      try {
        await sendTeamMessage(conversationId, body, attachment);
        await refreshMessages(conversationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : GENERIC_ERROR);
      } finally {
        setIsSending(false);
      }
    },
    [refreshMessages],
  );

  const sendText = useCallback(
    (text: string) => {
      const body = text.trim().slice(0, MAX_LIVE_CHAT_BODY);
      if (!selectedId || !body || isSending) return;
      void deliver(selectedId, body, null);
    },
    [selectedId, isSending, deliver],
  );

  const sendFile = useCallback(
    async (file: File) => {
      if (!selectedId) return;
      const problem = validateAttachmentFile(file);
      if (problem) {
        setError(problem);
        return;
      }
      setIsSending(true);
      setError(null);
      try {
        const attachment = await uploadChatAttachment(file);
        await sendTeamMessage(selectedId, '', attachment);
        await refreshMessages(selectedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : GENERIC_ERROR);
      } finally {
        setIsSending(false);
      }
    },
    [selectedId, refreshMessages],
  );

  return {
    conversations,
    isListLoaded,
    selectedId,
    selectConversation,
    messages,
    error,
    isSending,
    isRemoteTyping,
    notifyTyping,
    sendText,
    sendFile,
    retry: () => (selectedId ? refreshMessages(selectedId) : refreshConversations()),
  };
}
