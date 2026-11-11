import { motion } from 'framer-motion';
import {
  AGENT_PROVIDER_LABELS,
  summarizeUsage,
  type AgentLog,
  type ProviderUsage,
} from '@/lib/agent';
import AgentCard from './AgentCard';

type MetricRow = { label: string; display: string; percent: number };

function UsageChart({ title, rows }: { title: string; rows: MetricRow[] }) {
  return (
    <div className="fx-neon fx-lift rounded-xl bg-brand-lavender/40 p-4">
      <p className="mb-3 text-sm font-semibold text-brand-deep">{title}</p>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-brand-deep/80">{row.label}</span>
              <span className="tabular-nums font-semibold text-brand-deep">{row.display}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-indigo to-brand-orange"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(row.percent, row.percent > 0 ? 3 : 0)}%` }}
                transition={{ duration: 0.8, delay: index * 0.08, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildRows(usage: ProviderUsage[]) {
  const maxRequests = Math.max(1, ...usage.map((item) => item.requests));
  const maxLatency = Math.max(1, ...usage.map((item) => item.averageLatencyMs));
  const name = (provider: ProviderUsage['provider']) => AGENT_PROVIDER_LABELS[provider];
  return {
    requests: usage.map((item) => ({
      label: name(item.provider),
      display: item.requests.toLocaleString(),
      percent: (item.requests / maxRequests) * 100,
    })),
    latency: usage.map((item) => ({
      label: name(item.provider),
      display: item.averageLatencyMs > 0 ? `${item.averageLatencyMs.toLocaleString()} ms` : 'No data',
      percent: (item.averageLatencyMs / maxLatency) * 100,
    })),
    errors: usage.map((item) => ({
      label: name(item.provider),
      display: item.requests > 0 ? `${Math.round(item.errorRate * 100)}%` : 'No data',
      percent: item.errorRate * 100,
    })),
  };
}

export default function AgentUsage({ logs }: { logs: AgentLog[] }) {
  const usage = summarizeUsage(logs);
  const rows = buildRows(usage);
  const totalRequests = usage.reduce((sum, item) => sum + item.requests, 0);

  return (
    <AgentCard
      title="Usage in the last 7 days"
      description={`${totalRequests.toLocaleString()} ${totalRequests === 1 ? 'request' : 'requests'} across all providers, including test messages.`}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <UsageChart title="Requests per provider" rows={rows.requests} />
        <UsageChart title="Average latency" rows={rows.latency} />
        <UsageChart title="Error rate" rows={rows.errors} />
      </div>
    </AgentCard>
  );
}