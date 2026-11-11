import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { Minus, Phone, RotateCcw, MessageSquare, Send, Mail, ChevronDown } from 'lucide-react';
import BrandMark from './BrandMark';
import ChatInput from './ChatInput';
import LeadCard from './LeadCard';
import LiveChatPanel from './LiveChatPanel';
import MessageBubble from './MessageBubble';
import QuickReplies from './QuickReplies';
import type { QuickReplyAction } from './chatConfig';
import type { LeadPayload } from './chatApi';
import type { ChatMessage } from './useChat';
import { DEFAULT_COMPANY_NAME, type CompanySettings } from '@/lib/company';

type ChatPanelProps = {
  isMobile: boolean;
  company: CompanySettings | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSend: (text: string) => void;
  onQuickReply: (action: QuickReplyAction) => void;
  onRetry: () => void;
  onClearChat: () => void;
  onCompleteLead: (messageId: string, lead: LeadPayload) => Promise<void>;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi there, welcome to CupidCreativeX. I can tell you about our services, prepare a quote or help you book a project. What can I do for you today?',
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SHEET_DISMISS_DISTANCE = 120;
const SHEET_DISMISS_VELOCITY = 500;

export default function ChatPanel({
  isMobile,
  company,
  messages,
  isLoading,
  error,
  onClose,
  onSend,
  onQuickReply,
  onRetry,
  onClearChat,
  onCompleteLead,
}: ChatPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [showHuman, setShowHuman] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages, isLoading, error, reduceMotion]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SHEET_DISMISS_DISTANCE || info.velocity.y > SHEET_DISMISS_VELOCITY) {
      onClose();
    }
  };

  const placement = isMobile
    ? 'inset-x-0 bottom-0 top-3 rounded-t-3xl'
    : 'right-6 bottom-[calc(96px+env(safe-area-inset-bottom))] h-[600px] max-h-[calc(100dvh-120px)] w-[380px] rounded-3xl';

  const motionProps = isMobile
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring' as const, stiffness: 320, damping: 34 },
      }
    : {
        initial: { opacity: 0, scale: 0.85, y: 24 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.9, y: 16 },
        transition: { type: 'spring' as const, stiffness: 380, damping: 30 },
      };

  return (
    <motion.div
      ref={panelRef}
      id="cca-chat-panel"
      role="dialog"
      aria-modal={isMobile}
      aria-label={`${company?.company_name ?? DEFAULT_COMPANY_NAME} Assistant`}
      onKeyDown={handleKeyDown}
      drag={isMobile ? 'y' : false}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={handleDragEnd}
      style={{ transformOrigin: 'bottom right' }}
      {...motionProps}
      className={`fixed z-50 flex flex-col overflow-hidden bg-white shadow-[0_32px_80px_-16px_rgba(43,26,94,0.45),0_8px_24px_-8px_rgba(43,26,94,0.25)] ${placement}`}
    >
      <header
        onPointerDown={(event) => {
          if (isMobile) dragControls.start(event);
        }}
        className={`relative flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-brand-deep/95 via-brand-deep/90 to-brand-indigo/90 px-5 py-4 text-white backdrop-blur-xl ${
          isMobile ? 'cursor-grab touch-none active:cursor-grabbing' : ''
        }`}
      >
        {isMobile && (
          <span aria-hidden="true" className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/40" />
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent"
        />
        <BrandMark logoUrl={company?.logo_url} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold leading-[1.2]">
            {company?.company_name ?? DEFAULT_COMPANY_NAME} Assistant
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
            <span className="relative flex size-2">
              <motion.span
                className="absolute inset-0 rounded-full bg-emerald-400"
                animate={reduceMotion ? undefined : { scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
              <span className="relative size-2 rounded-full bg-emerald-400" />
            </span>
            Online
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Minimize chat"
          className="flex size-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Minus className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* Dropdown Container with Hover and Click Listeners */}
      <div 
        onMouseEnter={() => setShowHuman(true)}
        onMouseLeave={() => setShowHuman(false)}
        className="relative border-b border-brand-indigo/10 bg-white"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <button
            type="button"
            onClick={() => setShowHuman((open) => !open)}
            aria-expanded={showHuman}
            aria-controls="cca-human-panel"
            className="fx-btn flex items-center justify-between gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
          >
            <span className="flex items-center gap-1.5">
              <Phone className="size-4" aria-hidden="true" />
              Talk to a human
            </span>
            <motion.span
              animate={{ rotate: showHuman ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={onClearChat}
            disabled={isEmpty}
            className="fx-btn flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-brand-deep/70 transition hover:bg-brand-lavender hover:text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:opacity-40"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Clear chat
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showHuman && (
            <motion.div
              id="cca-human-panel"
              key="human"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden bg-brand-lavender border-t border-brand-indigo/10"
            >
              <div className="p-4 space-y-2.5">
                <p className="text-xs font-medium text-brand-deep/80 px-1">
                  Prefer to connect directly? Choose an option below:
                </p>
                
                <a
                  href="https://wa.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fx-btn fx-ring flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <MessageSquare className="size-4" />
                  Chat with us on WhatsApp
                </a>

                <a
                  href="https://t.me/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fx-btn fx-ring flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <Send className="size-4" />
                  Chat with us on Telegram
                </a>

                <a
                  href="mailto:support@cupidcreativex.com"
                  className="fx-btn fx-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                >
                  <Mail className="size-4" />
                  Send us an email
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {liveMode ? (
        <LiveChatPanel autoFocus={!isMobile} onExit={() => setLiveMode(false)} />
      ) : (
        <>
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-gradient-to-b from-white to-brand-lavender/50 px-4 py-4"
          >
            {isEmpty ? (
              <>
                <MessageBubble message={WELCOME_MESSAGE} />
                <QuickReplies onSelect={onQuickReply} disabled={isLoading} />
              </>
            ) : (
              messages.map((message) =>
                message.kind === 'lead' ? (
                  <LeadCard
                    key={message.id}
                    submitted={Boolean(message.submitted)}
                    onSubmit={(lead) => onCompleteLead(message.id, lead)}
                  />
                ) : (
                  <MessageBubble key={message.id} message={message} />
                ),
              )
            )}

            {error && (
              <div role="alert" className="ml-10 flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={onRetry}
                  disabled={isLoading}
                  className="fx-btn rounded-full bg-white px-3 py-1 font-medium text-red-700 shadow-sm transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-brand-indigo/10 bg-white px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <ChatInput onSend={onSend} disabled={isLoading} autoFocus={!isMobile} />
          </div>
        </>
      )}
    </motion.div>
  );
}