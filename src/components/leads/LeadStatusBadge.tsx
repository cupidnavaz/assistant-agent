import { LEAD_STATUS_LABELS, type LeadStatus } from '@/lib/leads';

export const LEAD_STATUS_STYLES: Record<LeadStatus, { badge: string; bar: string }> = {
  new: { badge: 'bg-[#f97316]/15 text-[#f97316] ring-[#f97316]/30', bar: 'bg-[#f97316]' },
  contacted: { badge: 'bg-[#06b6d4]/15 text-[#06b6d4] ring-[#06b6d4]/30', bar: 'bg-[#06b6d4]' },
  won: { badge: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30', bar: 'bg-emerald-400' },
  lost: { badge: 'bg-rose-500/15 text-rose-400 ring-rose-500/30', bar: 'bg-rose-500' },
};

type LeadStatusBadgeProps = { status: LeadStatus };

export default function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-all duration-300 ${LEAD_STATUS_STYLES[status].badge}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${LEAD_STATUS_STYLES[status].bar}`} />
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}