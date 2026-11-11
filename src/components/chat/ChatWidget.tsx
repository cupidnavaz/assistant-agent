import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MessageCircle, X, Send, Phone, Mail } from 'lucide-react';
import ChatPanel from './ChatPanel';
import { useChat } from './useChat';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useCompanySettings } from '@/hooks/useCompanySettings';

const TOOLTIP_SHOW_AFTER_MS = 4000;
const TOOLTIP_HIDE_AFTER_MS = 10000;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useMediaQuery('(max-width: 639px)');
  const reduceMotion = useReducedMotion();
  const { company } = useCompanySettings();
  const isOpenRef = useRef(isOpen);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const handleReplyComplete = useCallback(() => {
    if (!isOpenRef.current) setUnread((count) => count + 1);
  }, []);

  const chat = useChat({ onReplyComplete: handleReplyComplete });

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const show = setTimeout(() => setTooltipVisible(true), TOOLTIP_SHOW_AFTER_MS);
    const hide = setTimeout(() => setTooltipVisible(false), TOOLTIP_HIDE_AFTER_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen, isMobile]);

  const open = () => {
    setIsOpen(true);
    setUnread(0);
  };

  const close = () => {
    setIsOpen(false);
    launcherRef.current?.focus();
  };

  // Completely hides the widget launcher when the chat panel is open
  const showLauncher = !isOpen;

  return (
    <div className="font-body text-brand-deep antialiased">
      <AnimatePresence>
        {isOpen && (
          <ChatPanel
            key="panel"
            isMobile={isMobile}
            company={company}
            messages={chat.messages}
            isLoading={chat.isLoading}
            error={chat.error}
            onClose={close}
            onSend={chat.sendText}
            onQuickReply={(action) =>
              action.type === 'lead' ? chat.startLead(action.label) : chat.sendText(action.prompt)
            }
            onRetry={chat.retry}
            onClearChat={chat.clearChat}
            onCompleteLead={chat.completeLead}
          />
        )}
      </AnimatePresence>

      {showLauncher && (
        <div
          className="fixed right-6 z-50 flex items-center"
          style={{ bottom: 'calc(24px + env(safe-area-inset-bottom))' }}
        >
          <AnimatePresence>
            {tooltipVisible && !isOpen && (
              <motion.button
                key="tooltip"
                type="button"
                onClick={open}
                initial={{ opacity: 0, x: 8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 8, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="mr-5 whitespace-nowrap rounded-xl bg-brand-deep px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-brand-deep/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                Chat with us
              </motion.button>
            )}
          </AnimatePresence>

          {/* Main card/widget wrapper with glass effect, pause on hover, and smooth card zoom-out animation */}
          <motion.div 
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={reduceMotion ? undefined : { scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="relative flex items-center justify-center size-36 rounded-full group cursor-pointer backdrop-blur-md bg-brand-deep/10 border border-white/20 shadow-[0_8px_32px_0_rgba(43,26,94,0.15)]"
          >
            {/* Shiny glowing border/halo effect */}
            {!isOpen && (
              <div className="absolute inset-2 rounded-full border border-brand-orange/40 bg-brand-orange/5 shadow-[0_0_25px_rgba(249,115,22,0.35)] animate-pulse pointer-events-none" />
            )}

            {/* Rotating Text Ring (Pauses on hover) */}
            {!isOpen && (
              <motion.svg
                aria-hidden="true"
                viewBox="0 0 120 120"
                className="pointer-events-none absolute inset-0 size-full overflow-visible text-brand-orange"
                animate={reduceMotion || isHovered ? { rotate: isHovered ? undefined : 360 } : { rotate: 360 }}
                style={{ animationPlayState: isHovered ? 'paused' : 'running' }}
                transition={isHovered ? {} : { duration: 32, ease: 'linear', repeat: Infinity }}
              >
                <defs>
                  <path id="cca-launcher-ring" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
                </defs>
                <text fill="currentColor" fontSize="10.5" fontWeight="700" letterSpacing="0.8">
                  <textPath href="#cca-launcher-ring" textLength="289" lengthAdjust="spacing">
                    Ask anything • Get a quote • Talk to us •
                  </textPath>
                </text>
              </motion.svg>
            )}

            {/* Centered Chat Launcher Button */}
            <motion.button
              ref={launcherRef}
              type="button"
              onClick={() => (isOpen ? close() : open())}
              aria-label={isOpen ? 'Close chat' : 'Open chat with CupidCreativeX'}
              aria-expanded={isOpen}
              aria-controls="cca-chat-panel"
              whileTap={{ scale: 0.88 }}
              className="fx-ring relative z-10 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-deep to-brand-indigo text-white shadow-[0_12px_32px_-6px_rgba(43,26,94,0.55)] transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
            >
              {!isOpen && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full ring-2 ring-brand-orange/70 motion-safe:animate-ping pointer-events-none"
                />
              )}

              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isOpen ? 'close' : 'chat'}
                  initial={{ rotate: isOpen ? -90 : 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: isOpen ? 90 : -90, opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                  className="flex"
                >
                  {isOpen ? (
                    <X className="size-6" aria-hidden="true" />
                  ) : (
                    <MessageCircle className="size-6" aria-hidden="true" />
                  )}
                </motion.span>
              </AnimatePresence>

              <AnimatePresence>
                {unread > 0 && !isOpen && (
                  <motion.span
                    key="badge"
                    aria-label={`${unread} unread ${unread === 1 ? 'message' : 'messages'}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                    className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-[11px] font-semibold text-brand-deep ring-2 ring-white"
                  >
                    {unread > 9 ? '9+' : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>
      )}
    </div>
  );
}