import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChatReply, submitLead, type ApiMessage, type LeadPayload } from './chatApi';
import { CHAT_STORAGE_KEY, MAX_HISTORY_MESSAGES, MAX_INPUT_CHARS } from './chatConfig';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  kind?: 'text' | 'lead';
  pending?: boolean;
  submitted?: boolean;
};

type StoredChat = { sessionId: string; messages: ChatMessage[] };

const GENERIC_ERROR = 'Something went wrong. Please try again in a moment.';

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isStoredMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string'
  );
}

function loadStoredChat(): StoredChat {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        'sessionId' in parsed &&
        typeof parsed.sessionId === 'string' &&
        'messages' in parsed &&
        Array.isArray(parsed.messages)
      ) {
        return {
          sessionId: parsed.sessionId,
          messages: parsed.messages.filter(isStoredMessage).filter((m) => !m.pending),
        };
      }
    }
  } catch {
    // unreadable storage entry; start a fresh conversation
  }
  return { sessionId: createId(), messages: [] };
}

function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  const textMessages = messages.filter(
    (m) => m.kind !== 'lead' && !m.pending && m.content.trim().length > 0,
  );
  const recent = textMessages.slice(-MAX_HISTORY_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === 'user');
  return recent.slice(firstUser === -1 ? recent.length : firstUser).map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_INPUT_CHARS),
  }));
}

export function useChat(options: { onReplyComplete: () => void }) {
  const [stored] = useState(loadStoredChat);
  const [sessionId, setSessionId] = useState(stored.sessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(stored.messages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onReplyCompleteRef = useRef(options.onReplyComplete);

  useEffect(() => {
    onReplyCompleteRef.current = options.onReplyComplete;
  }, [options.onReplyComplete]);

  useEffect(() => {
    try {
      const payload: StoredChat = { sessionId, messages: messages.filter((m) => !m.pending) };
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // storage full or disabled; the chat still works for this visit
    }
  }, [sessionId, messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const requestReply = useCallback(
    async (history: ChatMessage[]) => {
      const replyId = createId();
      const controller = new AbortController();
      abortRef.current = controller;

      setMessages((prev) => [...prev, { id: replyId, role: 'assistant', content: '', pending: true }]);
      setIsLoading(true);
      setError(null);

      try {
        await streamChatReply({
          sessionId,
          messages: toApiMessages(history),
          signal: controller.signal,
          onText: (text) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === replyId ? { ...m, content: m.content + text } : m)),
            ),
        });
        setMessages((prev) =>
          prev
            .filter((m) => !(m.id === replyId && m.content.length === 0))
            .map((m) => (m.id === replyId ? { ...m, pending: false } : m)),
        );
        onReplyCompleteRef.current();
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : GENERIC_ERROR);
        setMessages((prev) =>
          prev
            .filter((m) => !(m.id === replyId && m.content.length === 0))
            .map((m) => (m.id === replyId ? { ...m, pending: false } : m)),
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    [sessionId],
  );

  const sendText = useCallback(
    (text: string) => {
      const content = text.trim().slice(0, MAX_INPUT_CHARS);
      if (!content || isLoading) return;
      const next: ChatMessage[] = [...messages, { id: createId(), role: 'user', content, kind: 'text' }];
      setMessages(next);
      void requestReply(next);
    },
    [messages, isLoading, requestReply],
  );

  const retry = useCallback(() => {
    if (isLoading) return;
    void requestReply(messages);
  }, [messages, isLoading, requestReply]);

  const startLead = useCallback((label: string) => {
    setMessages((prev) => [
      ...prev,
      { id: createId(), role: 'user', content: label, kind: 'text' },
      { id: createId(), role: 'assistant', content: '', kind: 'lead' },
    ]);
  }, []);

  const completeLead = useCallback(async (messageId: string, lead: LeadPayload) => {
    await submitLead(lead);
    const firstName = lead.name.split(' ')[0];
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId ? { ...m, submitted: true } : m)),
      {
        id: createId(),
        role: 'assistant',
        content: `Thank you, ${firstName}. We have your details and our team will be in touch soon.`,
      },
    ]);
  }, []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(createId());
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendText,
    retry,
    startLead,
    completeLead,
    clearChat,
  };
}
