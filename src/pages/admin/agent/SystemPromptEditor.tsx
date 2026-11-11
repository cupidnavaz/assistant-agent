import { RotateCcw } from 'lucide-react';
import { DEFAULT_SYSTEM_PROMPT, SYSTEM_PROMPT_MAX_CHARS } from '@/lib/agent';
import AgentCard, { INPUT_CLASS } from './AgentCard';

type SystemPromptEditorProps = { value: string; onChange: (value: string) => void };

export default function SystemPromptEditor({ value, onChange }: SystemPromptEditorProps) {
  const overLimit = value.length > SYSTEM_PROMPT_MAX_CHARS;
  const isDefault = value === DEFAULT_SYSTEM_PROMPT;
  return (
    <AgentCard
      title="System prompt"
      description="The instructions that shape how the assistant speaks and what it knows."
      action={
        <button
          type="button"
          onClick={() => onChange(DEFAULT_SYSTEM_PROMPT)}
          disabled={isDefault}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:opacity-40"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset to default
        </button>
      }
    >
      <label htmlFor="agent-system-prompt" className="sr-only">
        System prompt
      </label>
      <textarea
        id="agent-system-prompt"
        rows={12}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT_CLASS} resize-y font-mono text-[13px] leading-[1.5] ${overLimit ? 'border-red-400' : ''}`}
      />
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={overLimit ? 'font-medium text-red-700' : 'text-brand-deep/60'}>
          {overLimit ? `Too long. Keep it to ${SYSTEM_PROMPT_MAX_CHARS} characters.` : 'Changes apply to new replies after saving.'}
        </span>
        <span className={`tabular-nums ${overLimit ? 'font-medium text-red-700' : 'text-brand-deep/60'}`}>
          {value.length.toLocaleString()} / {SYSTEM_PROMPT_MAX_CHARS.toLocaleString()}
        </span>
      </div>
    </AgentCard>
  );
}
