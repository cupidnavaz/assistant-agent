import { MAX_TOKENS_RANGE, MODEL_FIELD, MODEL_MAX_CHARS, AGENT_PROVIDER_LABELS, AGENT_PROVIDERS, type AgentProvider, type EditableAgentSettings } from '@/lib/agent';
import AgentCard, { INPUT_CLASS } from './AgentCard';

type AgentConfigFieldsProps = {
  draft: EditableAgentSettings;
  onChange: (patch: Partial<EditableAgentSettings>) => void;
};

export default function AgentConfigFields({ draft, onChange }: AgentConfigFieldsProps) {
  return (
    <AgentCard title="Model and behaviour" description="Model names are sent to each provider exactly as typed.">
      <div className="space-y-5">
        <div className="space-y-3">
          {AGENT_PROVIDERS.map((provider: AgentProvider) => {
            const field = MODEL_FIELD[provider];
            return (
              <label key={provider} className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-brand-deep">
                  {AGENT_PROVIDER_LABELS[provider]} model
                  {draft.active_provider === provider && (
                    <span className="fx-pop-in rounded-full bg-brand-orange/10 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
                      Active
                    </span>
                  )}
                </span>
                <input
                  type="text"
                  value={draft[field]}
                  maxLength={MODEL_MAX_CHARS}
                  onChange={(event) => onChange({ [field]: event.target.value })}
                  className={INPUT_CLASS}
                />
              </label>
            );
          })}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm font-medium text-brand-deep">
            <label htmlFor="agent-temperature">Temperature</label>
            <span className="tabular-nums text-brand-indigo">{draft.temperature.toFixed(2)}</span>
          </div>
          <input
            id="agent-temperature"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.temperature}
            onChange={(event) => onChange({ temperature: Number(event.target.value) })}
            className="w-full cursor-pointer accent-brand-orange"
          />
          <div className="mt-1 flex justify-between text-xs text-brand-deep/60">
            <span>Focused</span>
            <span>Creative</span>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-brand-deep">Max tokens</span>
          <input
            type="number"
            min={MAX_TOKENS_RANGE.min}
            max={MAX_TOKENS_RANGE.max}
            step={10}
            value={Number.isNaN(draft.max_tokens) ? '' : draft.max_tokens}
            onChange={(event) => onChange({ max_tokens: event.target.valueAsNumber })}
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-xs text-brand-deep/60">
            Between {MAX_TOKENS_RANGE.min} and {MAX_TOKENS_RANGE.max}.
          </span>
        </label>

        <div className="flex items-start justify-between gap-4 rounded-xl bg-brand-lavender/50 p-4">
          <div>
            <p className="text-sm font-medium text-brand-deep">Automatic fallback</p>
            <p className="mt-0.5 text-xs leading-[1.5] text-brand-deep/70">
              If the active provider fails or has no key, try the other providers in turn.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={draft.fallback_enabled}
            aria-label="Automatic fallback"
            onClick={() => onChange({ fallback_enabled: !draft.fallback_enabled })}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo ${
              draft.fallback_enabled ? 'bg-brand-indigo' : 'bg-brand-deep/20'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ${
                draft.fallback_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </AgentCard>
  );
}