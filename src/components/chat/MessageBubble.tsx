import { motion, useReducedMotion } from 'framer-motion';
import BrandMark from './BrandMark';
import TypingIndicator from './TypingIndicator';
import type { ChatMessage } from './useChat';

type MessageBubbleProps = { message: ChatMessage };

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isWaiting = !isUser && message.pending && message.content.length === 0;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && <BrandMark size="sm" className="mb-0.5" />}
      <motion.div
        whileHover={reduceMotion ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-[1.5] break-words whitespace-pre-wrap backdrop-blur-xl transition-[box-shadow] duration-300 hover:shadow-[0_0_0_1px_rgba(75,47,208,0.35),0_0_28px_-2px_rgba(75,47,208,0.55)] ${
          isUser
            ? 'rounded-br-md border border-white/20 bg-brand-indigo/90 text-white shadow-[0_10px_30px_-12px_rgba(75,47,208,0.6)]'
            : 'rounded-bl-md border border-white/70 bg-white/60 text-brand-deep shadow-[0_10px_30px_-14px_rgba(43,26,94,0.35)] ring-1 ring-brand-indigo/10'
        }`}
      >
        {isWaiting ? <TypingIndicator /> : message.content}
      </motion.div>
    </motion.div>
  );
}
