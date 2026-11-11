import { useEffect, useId, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

type ModalProps = {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ title, description, onClose, children }: ModalProps) {
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-brand-deep/40 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-brand-deep shadow-[0_32px_80px_-16px_rgba(43,26,94,0.45)] sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="fx-text-gradient font-display text-xl font-bold leading-[1.2]">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-brand-deep/70">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-deep/70 transition hover:rotate-90 hover:bg-brand-lavender hover:text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}