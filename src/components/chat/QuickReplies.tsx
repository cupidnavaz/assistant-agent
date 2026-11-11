import { motion } from 'framer-motion';
import { QUICK_REPLIES, type QuickReplyAction } from './chatConfig';

type QuickRepliesProps = {
  onSelect: (action: QuickReplyAction) => void;
  disabled: boolean;
};

export default function QuickReplies({ onSelect, disabled }: QuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 pl-10">
      {QUICK_REPLIES.map((action, index) => (
        <motion.button
          key={action.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(action)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + index * 0.08, type: 'spring', stiffness: 400, damping: 28 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="fx-ring rounded-full border border-brand-indigo/20 bg-white px-3.5 py-2 text-sm font-medium text-brand-deep shadow-sm transition-colors hover:border-brand-orange hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {action.label}
        </motion.button>
      ))}
    </div>
  );
}