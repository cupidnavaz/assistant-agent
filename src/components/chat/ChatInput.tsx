import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Paperclip, Send } from 'lucide-react';
import { MAX_INPUT_CHARS } from './chatConfig';

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled: boolean;
  autoFocus: boolean;
  placeholder?: string;
  label?: string;
  onAttach?: (file: File) => void;
  onTyping?: () => void;
};

const MAX_TEXTAREA_HEIGHT = 128;
const COUNTER_THRESHOLD = 800;

export default function ChatInput({
  onSend,
  disabled,
  autoFocus,
  placeholder = 'Ask about our services...',
  label = 'Message CupidCreativeX',
  onAttach,
  onTyping,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = value.trim().length > 0 && !disabled;
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus && !disabled) textareaRef.current?.focus();
  }, [autoFocus, disabled]);

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  };

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    if (event.target.value.trim()) onTyping?.();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onAttach?.(file);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2">
      {onAttach && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Attach a file"
            className="fx-btn flex size-11 shrink-0 items-center justify-center rounded-full text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:opacity-40"
          >
            <Paperclip className="size-5" aria-hidden="true" />
          </button>
        </>
      )}
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          maxLength={MAX_INPUT_CHARS}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label}
          aria-describedby="cca-chat-input-hint"
          className="block max-h-32 w-full resize-none rounded-2xl border border-brand-indigo/20 bg-white px-4 py-2.5 pr-14 text-[15px] leading-[1.5] text-brand-deep placeholder:text-brand-deep/40 transition duration-300 focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 focus:shadow-[0_0_24px_-8px] focus:shadow-brand-indigo/50 disabled:bg-brand-lavender/50"
        />
        {value.length >= COUNTER_THRESHOLD && (
          <span
            className={`pointer-events-none absolute bottom-2.5 right-3 text-xs ${
              value.length >= MAX_INPUT_CHARS ? 'text-red-600' : 'text-brand-deep/60'
            }`}
          >
            {value.length}/{MAX_INPUT_CHARS}
          </span>
        )}
        <span id="cca-chat-input-hint" className="sr-only">
          Press Enter to send. Press Shift and Enter for a new line.
        </span>
      </div>
      <motion.button
        type="button"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        whileHover={canSend && !reduceMotion ? { scale: 1.08 } : undefined}
        whileTap={{ scale: 0.85, rotate: -12 }}
        animate={
          canSend && !reduceMotion
            ? { boxShadow: ['0 0 0 0 rgba(255,106,0,0.55)', '0 0 0 12px rgba(255,106,0,0)'] }
            : { boxShadow: '0 0 0 0 rgba(255,106,0,0)' }
        }
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 18,
          boxShadow: canSend && !reduceMotion ? { duration: 1.6, repeat: Infinity, ease: 'easeOut' } : { duration: 0.2 },
        }}
        className="group relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-orange text-brand-deep shadow-md shadow-brand-orange/30 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-brand-orange/40 disabled:shadow-none"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        <Send className="relative size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </motion.button>

    </div>
  );
}