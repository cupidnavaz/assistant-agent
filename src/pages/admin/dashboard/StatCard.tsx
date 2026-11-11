import { useEffect, useRef, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

type StatTone = 'deep' | 'indigo' | 'amber' | 'emerald';

const TONE_CLASSES: Record<StatTone, string> = {
  deep: 'bg-brand-deep text-white',
  indigo: 'bg-brand-lavender text-brand-indigo',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
};

type StatCardProps = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: StatTone;
  index: number;
};

function useCountUp(target: number): number {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? target : 0);
  const current = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      current.current = target;
      setDisplay(target);
      return;
    }
    const controls = animate(current.current, target, {
      duration: 0.9,
      ease: 'easeOut',
      onUpdate: (latest) => {
        current.current = latest;
        setDisplay(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [target, reduceMotion]);

  return display;
}

export default function StatCard({ label, value, hint, icon: Icon, tone, index }: StatCardProps) {
  const count = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
      whileHover={{ y: -4 }}
      className="fx-neon group relative overflow-hidden rounded-2xl border border-brand-indigo/10 bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-[0_18px_40px_-18px_rgba(43,26,94,0.35)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-brand-lavender/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-deep/70">{label}</p>
          <p className="fx-text-gradient mt-2 font-display text-3xl font-bold leading-[1.2] tabular-nums">{count}</p>
        </div>
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${TONE_CLASSES[tone]}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="relative mt-3 text-xs text-brand-deep/60">{hint}</p>
    </motion.div>
  );
}