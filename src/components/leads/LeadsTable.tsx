import { Fragment, useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { LEAD_STATUS_LABELS, LEAD_STATUSES, type Lead, type LeadStatus } from '@/lib/leads';
import LeadStatusBadge from './LeadStatusBadge';

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

export default function LeadsTable({
  leads,
  savingId,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
}: LeadsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#0d0d16]/90 backdrop-blur-xl shadow-2xl transition-all duration-500">
      <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
        <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-4">Lead</th>
            <th scope="col" className="px-6 py-4">Service</th>
            <th scope="col" className="px-6 py-4">Status</th>
            <th scope="col" className="px-6 py-4">Received</th>
            <th scope="col" className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {leads.map((lead) => {
            const expanded = expandedId === lead.id;
            const detailsId = `lead-details-${lead.id}`;
            return (
              <Fragment key={lead.id}>
                <tr className="transition-colors duration-300 hover:bg-white/[0.04]">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-white">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.contact}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-200">
                      {lead.service}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <LeadStatusBadge status={lead.status} />
                      {canEdit && (
                        <select
                          aria-label={`Change status for ${lead.name}`}
                          value={lead.status}
                          disabled={savingId === lead.id}
                          onChange={(event) => onStatusChange(lead.id, event.target.value as LeadStatus)}
                          className="rounded-xl border border-white/10 bg-[#0a0a0f] px-2.5 py-1 text-xs font-medium text-gray-300 transition-all hover:border-[#f97316]/40 focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20 disabled:opacity-50"
                        >
                          {LEAD_STATUSES.map((value) => (
                            <option key={value} value={value} className="bg-[#0d0d16] text-white">
                              {LEAD_STATUS_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-400">
                    <time dateTime={lead.created_at}>
                      {new Date(lead.created_at).toLocaleString(undefined, DATE_FORMAT)}
                    </time>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        onClick={() => setExpandedId(expanded ? null : lead.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all duration-300 hover:bg-[#f97316]/20 hover:text-[#f97316] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
                      >
                        {expanded ? 'Hide' : 'View'}
                        <ChevronDown
                          className={`size-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(lead)}
                          aria-label={`Edit ${lead.name}`}
                          className="flex size-8 items-center justify-center rounded-xl bg-white/5 text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(lead)}
                          aria-label={`Delete ${lead.name}`}
                          className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expanded && (
                  <tr id={detailsId} className="bg-black/30">
                    <td colSpan={5} className="px-6 py-5">
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[#f97316]">
                        Project description
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                        {lead.project_description || 'No project description was given.'}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}