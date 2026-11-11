import { motion } from 'framer-motion';

const DOT_TRANSITION = {
  duration: 0.9,
  repeat: Infinity,
  ease: [0.16, 1, 0.3, 1] as const,
};

export default function TypingIndicator() {
  return (
    <div role="status" aria-label="Assistant is typing" className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="size-2 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.6)]"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ ...DOT_TRANSITION, delay: index * 0.15 }}
        />
      ))}
    </div>
  );
}