import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import {
  MAX_TOKENS_RANGE,
  MODEL_FIELD,
  MODEL_MAX_CHARS,
  SYSTEM_PROMPT_MAX_CHARS,
  fetchAgentLogs,
  fetchAgentSettings,
  fetchProviderStatus,
  saveAgentSettings,
  type AgentLog,
  type AgentProvider,
  type AgentSettings,
  type EditableAgentSettings,
} from '@/lib/agent';
import AgentConfigFields from './AgentConfigFields';
import AgentLogsTable from './AgentLogsTable';
import AgentTestPanel from './AgentTestPanel';
import AgentUsage from './AgentUsage';
import ProviderCards from './ProviderCards';
import SystemPromptEditor from './SystemPromptEditor';

const LOG_FETCH_LIMIT = 1000;

type AgentPanelProps = { onDirtyChange: (dirty: boolean) => void };

function toEditable(settings: AgentSettings): EditableAgentSettings {
  return {
    active_provider: settings.active_provider,
    model_anthropic: settings.model_anthropic,
    model_openai: settings.model_openai,
    model_gemini: settings.model_gemini,
    temperature: settings.temperature,
    max_tokens: settings.max_tokens,
    system_prompt: settings.system_prompt,
    fallback_enabled: settings.fallback_enabled,
  };
}

function validate(draft: EditableAgentSettings): string | null {
  for (const field of Object.values(MODEL_FIELD)) {
    const model = draft[field].trim();
    if (!model) return 'Each provider needs a model name.';
    if (model.length > MODEL_MAX_CHARS) return `Model names must be ${MODEL_MAX_CHARS} characters or fewer.`;
  }
  if (!Number.isFinite(draft.temperature) || draft.temperature < 0 || draft.temperature > 1) {
    return 'Temperature must be between 0 and 1.';
  }
  if (
    !Number.isInteger(draft.max_tokens) ||
    draft.max_tokens < MAX_TOKENS_RANGE.min ||
    draft.max_tokens > MAX_TOKENS_RANGE.max
  ) {
    return `Max tokens must be between ${MAX_TOKENS_RANGE.min} and ${MAX_TOKENS_RANGE.max}.`;
  }
  if (!draft.system_prompt.trim()) return 'The system prompt cannot be empty.';
  if (draft.system_prompt.length > SYSTEM_PROMPT_MAX_CHARS) {
    return `The system prompt must be ${SYSTEM_PROMPT_MAX_CHARS} characters or fewer.`;
  }
  return null;
}

export default function AgentPanel({ onDirtyChange }: AgentPanelProps) {
  const [saved, setSaved] = useState<EditableAgentSettings | null>(null);
  const [draft, setDraft] = useState<EditableAgentSettings | null>(null);
  const [statuses, setStatuses] = useState<Record<AgentProvider, boolean> | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [logsError, setLogsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const reloadLogs = useCallback(async () => {
    try {
      setLogs(await fetchAgentLogs(LOG_FETCH_LIMIT));
      setLogsError(false);
    } catch {
      setLogsError(true);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = toEditable(await fetchAgentSettings());
      setSaved(settings);
      setDraft(settings);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The AI agent settings could not be loaded.');
    } finally {
      setLoading(false);
    }
    fetchProviderStatus()
      .then((result) => {
        setStatuses(result);
        setStatusError(false);
      })
      .catch(() => setStatusError(true));
    void reloadLogs();
  }, [reloadLogs]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => saved !== null && draft !== null && JSON.stringify(saved) !== JSON.stringify(draft),
    [saved, draft],
  );

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const update = (patch: Partial<EditableAgentSettings>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaveError(null);
  };

  const discard = () => {
    if (saved) setDraft(saved);
    setSaveError(null);
  };

  const validationError = draft ? validate(draft) : null;

  const save = async () => {
    if (!draft || validationError) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveAgentSettings(draft);
      setSaved(draft);
      setToast(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Loading AI agent settings" />
      </div>
    );
  }

  if (loadError || !draft) {
    return (
      <div role="alert" className="fx-fade-up fx-neon flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-700">{loadError ?? 'The AI agent settings could not be loaded.'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="fx-btn flex items-center gap-2 rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <section aria-label="Provider selection" className="space-y-3">
        <h2 className="fx-text-gradient font-display text-lg font-semibold text-brand-deep">Provider</h2>
        <ProviderCards
          active={draft.active_provider}
          statuses={statuses}
          statusError={statusError}
          onSelect={(provider) => update({ active_provider: provider })}
        />
        {statusError && (
          <p className="text-xs text-brand-deep/60">Key status could not be checked. Try refreshing the page.</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <AgentConfigFields draft={draft} onChange={update} />
        <AgentTestPanel draft={draft} onFinished={() => void reloadLogs()} />
      </div>

      <SystemPromptEditor value={draft.system_prompt} onChange={(value) => update({ system_prompt: value })} />

      <AgentUsage logs={logs} />
      {logsError && <p className="text-sm text-red-700">The usage data could not be loaded.</p>}
      <AgentLogsTable logs={logs} />

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-indigo/15 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(43,26,94,0.08)] backdrop-blur sm:px-6"
            role="region"
            aria-label="Unsaved changes"
          >
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-deep">You have unsaved changes</p>
                <p className="truncate text-xs text-brand-deep/70" role="status">
                  {saveError ?? validationError ?? 'Save to apply them to live chats.'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={discard}
                  disabled={saving}
                  className="fx-btn rounded-xl px-4 py-2.5 text-sm font-medium text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={saving || validationError !== null}
                  className="fx-btn fx-ring flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  {saving ? 'Saving' : 'Save changes'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="fixed right-4 bottom-24 z-50 flex items-center gap-2 rounded-xl bg-brand-deep px-4 py-3 text-sm font-medium text-white shadow-lg sm:right-6"
          >
            <Check className="size-4 text-emerald-300" aria-hidden="true" />
            AI agent settings saved
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}