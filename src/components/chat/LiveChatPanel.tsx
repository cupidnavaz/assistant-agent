import { useEffect, useRef } from 'react';
import { ArrowLeft, Radio } from 'lucide-react';
import ChatInput from './ChatInput';
import LiveMessageBubble from './LiveMessageBubble';
import TypingIndicator from './TypingIndicator';
import { useLiveChat } from './useLiveChat';

type LiveChatPanelProps = {
  autoFocus: boolean;
  onExit: () => void;
};

export default function LiveChatPanel({ autoFocus, onExit }: LiveChatPanelProps) {
  const { messages, isRemoteTyping, error, isSending, sendText, sendFile, notifyTyping, retry } = useLiveChat();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [messages, isRemoteTyping]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-brand-indigo/10 bg-white px-3 py-2">
        <button
          type="button"
          onClick={onExit}
          className="fx-btn flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Assistant
        </button>
        <p className="ml-auto flex items-center gap-1.5 pr-2 text-sm font-medium text-brand-deep/80">
          <Radio className="fx-pulse-slow size-4 text-emerald-600" aria-hidden="true" />
          Live with our team
        </p>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-white to-brand-lavender/50 px-4 py-4"
      >
        {messages.length === 0 && (
          <p className="fx-fade-up rounded-2xl bg-white px-4 py-3 text-sm leading-[1.5] text-brand-deep/80 shadow-sm">
            Send us a message and a member of our team will reply here. You can also attach an image or PDF.
          </p>
        )}
        {messages.map((message) => (
          <LiveMessageBubble key={message.id} message={message} isOwn={message.sender_role === 'visitor'} />
        ))}
        {isRemoteTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-brand-indigo/10 bg-white px-4 py-2 shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => void retry()}
              className="fx-btn rounded-full bg-white px-3 py-1 font-medium text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-brand-indigo/10 bg-white px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <ChatInput
          onSend={sendText}
          onAttach={(file) => void sendFile(file)}
          onTyping={notifyTyping}
          disabled={isSending}
          autoFocus={autoFocus}
          placeholder="Message our team..."
          label="Message our team"
        />
      </div>
    </>
  );
}