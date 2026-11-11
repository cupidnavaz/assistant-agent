import { AGENT_PROVIDER_LABELS, type AgentLog } from '@/lib/agent';
import AgentCard from './AgentCard';

const LOG_ROWS = 20;

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function AgentLogsTable({ logs }: { logs: AgentLog[] }) {
  const latest = logs.slice(0, LOG_ROWS);
  return (
    <AgentCard title="Latest requests" description={`The most recent ${LOG_ROWS} requests, including tests.`}>
      {latest.length === 0 ? (
        <p className="rounded-xl bg-brand-lavender/40 p-6 text-center text-sm text-brand-deep/70">
          No requests have been logged yet.
        </p>
      ) : (
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-brand-deep/60">
                <th scope="col" className="px-2 pb-3 font-semibold">Time</th>
                <th scope="col" className="px-2 pb-3 font-semibold">Provider</th>
                <th scope="col" className="px-2 pb-3 font-semibold">Model</th>
                <th scope="col" className="px-2 pb-3 text-right font-semibold">Latency</th>
                <th scope="col" className="px-2 pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-brand-lavender/40">
                  <td className="border-t border-brand-indigo/10 px-2 py-3 text-brand-deep/80">
                    {DATE_FORMAT.format(new Date(log.created_at))}
                  </td>
                  <td className="border-t border-brand-indigo/10 px-2 py-3 font-medium text-brand-deep">
                    {AGENT_PROVIDER_LABELS[log.provider]}
                  </td>
                  <td className="border-t border-brand-indigo/10 px-2 py-3 font-mono text-xs text-brand-deep/80">
                    {log.model}
                  </td>
                  <td className="border-t border-brand-indigo/10 px-2 py-3 text-right tabular-nums text-brand-deep/80">
                    {log.latency_ms.toLocaleString()} ms
                  </td>
                  <td className="border-t border-brand-indigo/10 px-2 py-3">
                    {log.status === 'ok' ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">OK</span>
                    ) : (
                      <span
                        title={log.error_message ?? undefined}
                        className="block max-w-[16rem] truncate rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700"
                      >
                        {log.error_message ?? 'Error'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AgentCard>
  );
}
