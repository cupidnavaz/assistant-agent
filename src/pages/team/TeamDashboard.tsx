import { useCallback, useEffect, useState } from 'react';
import { Camera, Loader2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import LeadFormDialog from '@/components/leads/LeadFormDialog';
import LeadsTable from '@/components/leads/LeadsTable';
import LiveChatInbox from '@/components/inbox/LiveChatInbox';
import Avatar from '@/components/ui/Avatar';
import AvatarDialog from '@/components/ui/AvatarDialog';
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import { saveTeamAvatar } from '@/lib/avatars';
import { deleteLead, fetchLeads, updateLeadStatus, type Lead, type LeadStatus } from '@/lib/leads';
import { TEAM_PERMISSION_LABELS, type TeamMember } from '@/lib/team';

type TeamDashboardProps = {
  member: TeamMember;
  onSignOut: () => Promise<void>;
};

export default function TeamDashboard({ member, onSignOut }: TeamDashboardProps) {
  const canView = member.permissions.includes('leads:view');
  const canEdit = member.permissions.includes('leads:edit');
  const canDelete = member.permissions.includes('leads:delete');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(canView);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ lead: Lead } | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(member.avatar_url);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setLeads(await fetchLeads());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'The leads could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const changeStatus = async (id: string, status: LeadStatus) => {
    setSavingId(id);
    setActionError(null);
    try {
      await updateLeadStatus(id, status);
      setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The status could not be changed.');
    } finally {
      setSavingId(null);
    }
  };

  const removeLead = async (lead: Lead) => {
    if (!window.confirm(`Delete the enquiry from ${lead.name}? This cannot be undone.`)) return;
    setActionError(null);
    try {
      await deleteLead(lead.id);
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The lead could not be deleted.');
    }
  };

  return (
    <div className="relative isolate min-h-dvh bg-brand-lavender/40 font-body text-brand-deep">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="fx-pulse-slow absolute -left-32 top-1/4 size-[28rem] rounded-full bg-brand-indigo/15 blur-[120px]" />
        <div className="fx-pulse-slow absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-brand-orange/15 blur-[120px]" />
      </div>
      <header className="fx-fade-in bg-brand-deep text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              aria-label="Change profile photo"
              className="fx-ring group relative rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <Avatar name={member.name} url={avatarUrl} size="md" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-deep/60 opacity-0 transition group-hover:opacity-100">
                <Camera className="size-4 text-white" aria-hidden="true" />
              </span>
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/65">Team workspace</p>
              <p className="font-display text-lg font-semibold leading-[1.2]">Welcome, {member.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="fx-btn flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <section aria-labelledby="team-permissions-title" className="fx-fade-up fx-neon rounded-2xl border border-brand-indigo/10 bg-white p-5 shadow-sm">
          <h2 id="team-permissions-title" className="fx-text-gradient font-display text-lg font-semibold leading-[1.2]">Your permissions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {member.permissions.length === 0 && (
              <p className="text-sm text-brand-deep/70">You have no permissions yet. Ask an administrator to assign some.</p>
            )}
            {member.permissions.map((permission) => (
              <span key={permission} className="rounded-full bg-brand-lavender px-3 py-1 text-xs font-medium text-brand-indigo">
                {TEAM_PERMISSION_LABELS[permission].label}
              </span>
            ))}
          </div>
        </section>

        {!canView ? (
          <div className="fx-fade-up fx-neon fx-lift rounded-2xl bg-white p-10 text-center shadow-sm">
            <ShieldAlert className="mx-auto mb-3 size-8 text-brand-indigo" aria-hidden="true" />
            <p className="font-display text-lg font-semibold">Leads are hidden for your account</p>
            <p className="mt-1 text-sm text-brand-deep/70">Ask an administrator if you need to view enquiries.</p>
          </div>
        ) : (
          <section aria-labelledby="team-leads-title" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="team-leads-title" className="fx-text-gradient font-display text-xl font-bold leading-[1.2]">Leads</h2>
                <p className="mt-1 text-sm text-brand-deep/70">{leads.length} enquiries</p>
              </div>
              <button type="button" onClick={() => void load()} className={`${SECONDARY_BUTTON_CLASS} fx-btn`}>
                <RefreshCw className="size-4" aria-hidden="true" />
                Refresh
              </button>
            </div>

            {actionError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Loading leads" />
              </div>
            ) : loadError ? (
              <div role="alert" className="fx-fade-up fx-neon flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-red-700">{loadError}</p>
                <button type="button" onClick={() => void load()} className={`${PRIMARY_BUTTON_CLASS} fx-btn`}>
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Try again
                </button>
              </div>
            ) : leads.length === 0 ? (
              <div className="fx-fade-up fx-neon fx-lift rounded-2xl bg-white p-10 text-center shadow-sm">
                <p className="font-display text-lg font-semibold">No leads yet</p>
                <p className="mt-1 text-sm text-brand-deep/70">New enquiries from the website chat will appear here.</p>
              </div>
            ) : (
              <LeadsTable
                leads={leads}
                savingId={savingId}
                canEdit={canEdit}
                canDelete={canDelete}
                onStatusChange={(id, status) => void changeStatus(id, status)}
                onEdit={(lead) => setEditor({ lead })}
                onDelete={(lead) => void removeLead(lead)}
              />
            )}
          </section>
        )}
        {canView && <LiveChatInbox />}
      </main>

      {editor && (
        <LeadFormDialog
          lead={editor.lead}
          onClose={() => setEditor(null)}
          onSaved={() => void load()}
        />
      )}
      {avatarOpen && (
        <AvatarDialog
          name={member.name}
          currentUrl={avatarUrl}
          onSave={async (url) => {
            await saveTeamAvatar(member.id, url);
            setAvatarUrl(url);
          }}
          onClose={() => setAvatarOpen(false)}
        />
      )}
    </div>
  );
}