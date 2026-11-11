import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import ChatInput from '@/components/chat/ChatInput';
import LiveMessageBubble from '@/components/chat/LiveMessageBubble';
import TypingIndicator from '@/components/chat/TypingIndicator';
import type { LiveChatConversation, LiveChatMessage } from '@/lib/liveChat';

type LiveChatThreadProps = {
  conversation: LiveChatConversation;
  messages: LiveChatMessage[];
  isRemoteTyping: boolean;
  error: string | null;
  isSending: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onAttach: (file: File) => void;
  onTyping: () => void;
  onRetry: () => void;
};

export default function LiveChatThread({
  conversation,
  messages,
  isRemoteTyping,
  error,
  isSending,
  onBack,
  onSend,
  onAttach,
  onTyping,
  onRetry,
}: LiveChatThreadProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, isRemoteTyping]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/20 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-gray-300 transition-all duration-300 hover:scale-105 hover:bg-[#f97316]/20 hover:text-[#f97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] md:hidden"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold leading-[1.2] text-white">
            {conversation.visitor_name} {conversation.id.slice(0, 6).toUpperCase()}
          </p>
          <p className="text-xs text-gray-400">
            Started {new Date(conversation.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-gradient-to-b from-[#0a0a0f] to-[#0d0d16] px-6 py-6"
      >
        {messages.map((message) => (
          <LiveMessageBubble key={message.id} message={message} isOwn={message.sender_role === 'team'} />
        ))}
        {isRemoteTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-white/10 bg-[#0d0d16] px-4 py-2.5 shadow-lg shadow-black/40">
              <TypingIndicator />
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 shadow-lg">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:brightness-110 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-[#0d0d16]/80 p-4 backdrop-blur-md">
        <ChatInput
          onSend={onSend}
          onAttach={onAttach}
          onTyping={onTyping}
          disabled={isSending}
          autoFocus={false}
          placeholder="Reply to the visitor..."
          label="Reply to the visitor"
        />
      </div>
    </div>
  );
}