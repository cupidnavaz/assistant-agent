import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send } from 'lucide-react';
import {
  AGENT_PROVIDER_LABELS,
  MODEL_FIELD,
  TEST_MESSAGE_MAX_CHARS,
  runAgentTest,
  type EditableAgentSettings,
  type ProviderTestResult,
} from '@/lib/agent';
import AgentCard, { INPUT_CLASS } from './AgentCard';

const SAMPLE_MESSAGE = 'Hi, what services does CupidCreativeX offer?';

type AgentTestPanelProps = {
  draft: EditableAgentSettings;
  onFinished: () => void;
};

export default function AgentTestPanel({ draft, onFinished }: AgentTestPanelProps) {
  const [message, setMessage] = useState(SAMPLE_MESSAGE);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProviderTestResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const provider = draft.active_provider;
  const model = draft[MODEL_FIELD[provider]];

  const send = async () => {
    setRunning(true);
    setRequestError(null);
    setResult(null);
    try {
      setResult(
        await runAgentTest({
          provider,
          model,
          systemPrompt: draft.system_prompt,
          temperature: draft.temperature,
          maxTokens: draft.max_tokens,
          message: message.trim(),
        }),
      );
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'The test could not be run.');
    } finally {
      setRunning(false);
      onFinished();
    }
  };

  const canSend = !running && message.trim().length > 0 && message.length <= TEST_MESSAGE_MAX_CHARS;

  return (
    <AgentCard
      title="Test agent"
      description={`Sends one message to ${AGENT_PROVIDER_LABELS[provider]} using the current form values. Live visitors are not affected.`}
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-brand-deep">Sample message</span>
          <textarea
            rows={3}
            value={message}
            maxLength={TEST_MESSAGE_MAX_CHARS}
            onChange={(event) => setMessage(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-brand-deep/60">
            Testing with unsaved changes is allowed. Save to make them live.
          </p>
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            className="fx-btn fx-ring flex items-center gap-2 rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            {running ? 'Waiting for reply' : 'Send test'}
          </button>
        </div>

        <div aria-live="polite" className="min-h-[7rem] rounded-xl bg-brand-lavender/50 p-4">
          {requestError && <p className="text-sm text-red-700">{requestError}</p>}
          {!requestError && !result && !running && (
            <p className="text-sm text-brand-deep/60">The reply will appear here.</p>
          )}
          {result && result.ok && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <p className="mb-2 text-xs font-semibold text-emerald-700">
                Reply in {result.latencyMs.toLocaleString()} ms
              </p>
              <p className="whitespace-pre-wrap text-sm leading-[1.5] text-brand-deep">
                {result.reply || 'The model returned an empty reply.'}
              </p>
            </motion.div>
          )}
          {result && !result.ok && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <p className="mb-2 text-xs font-semibold text-red-700">
                Failed after {result.latencyMs.toLocaleString()} ms
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-[1.5] text-red-700">{result.error}</p>
            </motion.div>
          )}
        </div>
      </div>
    </AgentCard>
  );
}