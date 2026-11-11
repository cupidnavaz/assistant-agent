import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type Lead, type LeadStatus } from '@/lib/leads';
import { LEAD_STATUS_STYLES } from '@/components/leads/LeadStatusBadge';

const TREND_DAYS = 14;

type LeadsChartProps = {
  leads: Lead[];
  statusCounts: Record<LeadStatus, number>;
};

type DayBucket = { key: string; label: string; full: string; count: number };

function dayKey(date: Date): string {
  return date.toLocaleDateString('en-CA');
}

function buildDayBuckets(leads: Lead[]): DayBucket[] {
  const perDay = new Map<string, number>();
  for (const lead of leads) {
    const key = dayKey(new Date(lead.created_at));
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (TREND_DAYS - 1 - index));
    const key = dayKey(date);
    return {
      key,
      label: date.toLocaleDateString(undefined, { day: 'numeric' }),
      full: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      count: perDay.get(key) ?? 0,
    };
  });
}

export default function LeadsChart({ leads, statusCounts }: LeadsChartProps) {
  const days = useMemo(() => buildDayBuckets(leads), [leads]);
  const peak = Math.max(0, ...days.map((day) => day.count));
  const total = LEAD_STATUSES.reduce((sum, status) => sum + statusCounts[status], 0);
  const recentTotal = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section
        aria-labelledby="leads-trend-title"
        className="fx-fade-up fx-neon fx-lift rounded-2xl border border-brand-indigo/10 bg-white p-5 shadow-sm lg:col-span-2"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="leads-trend-title" className="fx-text-gradient font-display text-lg font-semibold leading-[1.2]">
            Enquiries, last {TREND_DAYS} days
          </h2>
          <p className="text-xs text-brand-deep/60">
            {recentTotal} received · peak {peak} in a day
          </p>
        </div>
        <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2">
          {days.map((day, index) => (
            <div key={day.key} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
              <div className="relative flex flex-1 items-end">
                <span className="pointer-events-none absolute inset-x-0 -top-6 text-center text-xs font-semibold tabular-nums text-brand-deep opacity-0 transition-opacity group-hover:opacity-100">
                  {day.count}
                </span>
                <motion.div
                  title={`${day.full}: ${day.count}`}
                  initial={{ height: 0 }}
                  animate={{ height: peak ? `${(day.count / peak) * 100}%` : '0%' }}
                  transition={{ duration: 0.6, delay: index * 0.03, ease: 'easeOut' }}
                  className={`w-full min-h-[3px] rounded-t-md transition-[filter,box-shadow] duration-200 group-hover:brightness-110 group-hover:shadow-[0_0_18px_-2px] group-hover:shadow-brand-indigo/50 ${
                    day.count > 0 ? 'bg-gradient-to-t from-brand-indigo to-brand-deep' : 'bg-brand-lavender'
                  }`}
                />
              </div>
              <span className="text-center text-[10px] tabular-nums text-brand-deep/60">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="leads-status-title"
        className="fx-fade-up fx-neon fx-lift rounded-2xl border border-brand-indigo/10 bg-white p-5 shadow-sm [animation-delay:100ms]"
      >
        <h2 id="leads-status-title" className="fx-text-gradient font-display text-lg font-semibold leading-[1.2]">
          Status breakdown
        </h2>
        <p className="mt-1 text-xs text-brand-deep/60">{total} leads in total</p>
        <ul className="mt-5 space-y-4">
          {LEAD_STATUSES.map((status, index) => {
            const count = statusCounts[status];
            const percent = total ? Math.round((count / total) * 100) : 0;
            return (
              <li key={status}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span aria-hidden="true" className={`size-2.5 rounded-full ${LEAD_STATUS_STYLES[status].bar}`} />
                    {LEAD_STATUS_LABELS[status]}
                  </span>
                  <span className="tabular-nums text-brand-deep/70">
                    {count} <span className="text-xs">({percent}%)</span>
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-lavender">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + index * 0.08, ease: 'easeOut' }}
                    className={`h-full rounded-full ${LEAD_STATUS_STYLES[status].bar}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}