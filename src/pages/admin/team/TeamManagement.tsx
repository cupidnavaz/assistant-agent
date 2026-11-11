import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { ICON_BUTTON_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import Avatar from '@/components/ui/Avatar';
import {
  approveTeamMember,
  deleteTeamMember,
  fetchTeamMembers,
  TEAM_PERMISSION_LABELS,
  TEAM_STATUS_LABELS,
  type ActivationCode,
  type TeamMember,
  type TeamStatus,
} from '@/lib/team';
import ActivationCodeDialog from './ActivationCodeDialog';
import TeamMemberDialog from './TeamMemberDialog';

const STATUS_STYLES: Record<TeamStatus, string> = {
  invited: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  awaiting_approval: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  approved: 'bg-brand-lavender text-brand-indigo ring-brand-indigo/25',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25',
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

type Issued = { member: TeamMember; code: ActivationCode };

export default function TeamManagement() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ member: TeamMember | null } | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setMembers(await fetchTeamMembers());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The team could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (member: TeamMember) => {
    setBusyId(member.id);
    setActionError(null);
    try {
      const code = await approveTeamMember(member.id);
      setIssued({ member, code });
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The code could not be issued.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.email} from the team? They will lose access to the team dashboard.`)) return;
    setBusyId(member.id);
    setActionError(null);
    try {
      await deleteTeamMember(member.id);
      setMembers((prev) => prev.filter((item) => item.id !== member.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The member could not be removed.');
    } finally {
      setBusyId(null);
    }
  };

  const waitingCount = members.filter((member) => member.status === 'awaiting_approval').length;

  return (
    <section aria-labelledby="team-title" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-deep/70">
          {members.length} team {members.length === 1 ? 'member' : 'members'}
          {waitingCount > 0 && <span className="font-semibold text-amber-700"> · {waitingCount} waiting for approval</span>}
        </p>
        <button type="button" onClick={() => setEditor({ member: null })} className={`${PRIMARY_BUTTON_CLASS} fx-btn fx-ring`}>
          <Plus className="size-4" aria-hidden="true" />
          Add team member
        </button>
      </div>

      {actionError && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Loading team" />
        </div>
      ) : loadError ? (
        <div role="alert" className="fx-fade-up fx-neon flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-700">{loadError}</p>
          <button type="button" onClick={() => void load()} className={`${PRIMARY_BUTTON_CLASS} fx-btn`}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : members.length === 0 ? (
        <div className="fx-fade-up fx-neon fx-lift rounded-2xl bg-white p-10 text-center shadow-sm">
          <Users className="mx-auto mb-3 size-8 text-brand-indigo" aria-hidden="true" />
          <p className="font-display text-lg font-semibold">No team members yet</p>
          <p className="mt-1 text-sm text-brand-deep/70">Add someone, choose what they can do, then approve them when they ask to join.</p>
        </div>
      ) : (
        <div className="fx-fade-up overflow-x-auto rounded-2xl border border-brand-indigo/10 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-brand-lavender/50 text-xs font-semibold uppercase tracking-wide text-brand-deep/70">
              <tr>
                <th scope="col" className="px-5 py-3">Member</th>
                <th scope="col" className="px-5 py-3">Permissions</th>
                <th scope="col" className="px-5 py-3">Status</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-indigo/10">
              {members.map((member) => {
                const busy = busyId === member.id;
                const codeExpired =
                  member.activation_code_expires_at !== null && new Date(member.activation_code_expires_at) < new Date();
                return (
                  <tr key={member.id} className="transition-colors duration-200 hover:bg-brand-lavender/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} url={member.avatar_url} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-xs text-brand-deep/60">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {member.permissions.length === 0 && <span className="text-xs text-brand-deep/60">None</span>}
                        {member.permissions.map((permission) => (
                          <span key={permission} className="rounded-full bg-brand-lavender px-2.5 py-1 text-xs font-medium text-brand-indigo">
                            {TEAM_PERMISSION_LABELS[permission].label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[member.status]}`}>
                        {TEAM_STATUS_LABELS[member.status]}
                      </span>
                      {member.status === 'approved' && member.activation_code_expires_at && (
                        <p className={`mt-1 text-xs ${codeExpired ? 'text-rose-600' : 'text-brand-deep/60'}`}>
                          {codeExpired
                            ? 'Code expired'
                            : `Expires ${new Date(member.activation_code_expires_at).toLocaleString(undefined, DATE_FORMAT)}`}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {member.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => void approve(member)}
                            disabled={busy}
                            className={`${SECONDARY_BUTTON_CLASS} fx-btn px-3 py-1.5`}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <KeyRound className="size-4" aria-hidden="true" />
                            )}
                            {member.status === 'approved' ? 'New code' : 'Approve'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditor({ member })}
                          aria-label={`Edit ${member.name}`}
                          className={ICON_BUTTON_CLASS}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(member)}
                          disabled={busy}
                          aria-label={`Remove ${member.name}`}
                          className="flex size-8 items-center justify-center rounded-lg text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editor && (
        <TeamMemberDialog
          member={editor.member}
          onClose={() => setEditor(null)}
          onChanged={() => void load()}
        />
      )}

      {issued && (
        <ActivationCodeDialog
          member={issued.member}
          issued={issued.code}
          onClose={() => setIssued(null)}
        />
      )}
    </section>
  );
}