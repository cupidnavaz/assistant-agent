import { useCallback, useEffect, useRef, useState } from 'react';
import { openTypingChannel, type SenderRole, type TypingChannel } from '@/lib/liveChat';

const REMOTE_TYPING_HOLD_MS = 3000;
const TYPING_NOTIFY_INTERVAL_MS = 2000;

export function useTypingPresence(conversationId: string | null, role: SenderRole) {
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const channelRef = useRef<TypingChannel | null>(null);
  const lastNotifyRef = useRef(0);

  useEffect(() => {
    if (!conversationId) return;
    let hideTimer: number | undefined;
    const channel = openTypingChannel(conversationId, role, () => {
      setIsRemoteTyping(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setIsRemoteTyping(false), REMOTE_TYPING_HOLD_MS);
    });
    channelRef.current = channel;
    return () => {
      window.clearTimeout(hideTimer);
      channel.close();
      channelRef.current = null;
      setIsRemoteTyping(false);
    };
  }, [conversationId, role]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastNotifyRef.current < TYPING_NOTIFY_INTERVAL_MS) return;
    lastNotifyRef.current = now;
    channelRef.current?.notifyTyping();
  }, []);

  return { isRemoteTyping, notifyTyping };
}
