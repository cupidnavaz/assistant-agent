import { motion } from 'framer-motion';
import { AlertTriangle, Bot, Check, Gem, Loader2, Sparkles, type LucideIcon } from 'lucide-react';
import {
  AGENT_PROVIDER_DESCRIPTIONS,
  AGENT_PROVIDER_LABELS,
  AGENT_PROVIDERS,
  type AgentProvider,
} from '@/lib/agent';

const PROVIDER_ICONS: Record<AgentProvider, LucideIcon> = {
  anthropic: Sparkles,
  openai: Bot,
  gemini: Gem,
};

type ProviderCardsProps = {
  active: AgentProvider;
  statuses: Record<AgentProvider, boolean> | null;
  statusError: boolean;
  onSelect: (provider: AgentProvider) => void;
};

function StatusBadge({ configured, pending, failed }: { configured?: boolean; pending: boolean; failed: boolean }) {
  if (pending) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lavender px-2.5 py-1 text-xs font-medium text-brand-deep/70">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" />
        Checking
      </span>
    );
  }
  if (failed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
        Status unavailable
      </span>
    );
  }
  return configured ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      <Check className="size-3" aria-hidden="true" />
      Key configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
      <AlertTriangle className="size-3" aria-hidden="true" />
      Key missing
    </span>
  );
}

export default function ProviderCards({ active, statuses, statusError, onSelect }: ProviderCardsProps) {
  return (
    <div role="radiogroup" aria-label="AI provider" className="grid gap-4 md:grid-cols-3">
      {AGENT_PROVIDERS.map((provider) => {
        const selected = provider === active;
        const Icon = PROVIDER_ICONS[provider];
        return (
          <button
            key={provider}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(provider)}
            className="fx-fade-up fx-neon fx-ring group relative flex flex-col gap-4 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-brand-indigo/10 transition duration-300 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
          >
            {selected && (
              <motion.span
                layoutId="agent-provider-ring"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-brand-orange"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-lavender text-brand-indigo">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <StatusBadge
                configured={statuses?.[provider]}
                pending={!statuses && !statusError}
                failed={statusError && !statuses}
              />
            </div>
            <div>
              <p className="font-display text-lg font-semibold leading-[1.2] text-brand-deep">
                {AGENT_PROVIDER_LABELS[provider]}
              </p>
              <p className="mt-1 text-sm leading-[1.5] text-brand-deep/70">{AGENT_PROVIDER_DESCRIPTIONS[provider]}</p>
            </div>
            <span
              className={`text-xs font-semibold uppercase tracking-wide transition-colors ${
                selected ? 'text-brand-orange' : 'text-brand-deep/40 group-hover:text-brand-indigo'
              }`}
            >
              {selected ? 'Active provider' : 'Use this provider'}
            </span>
          </button>
        );
      })}
    </div>
  );
}