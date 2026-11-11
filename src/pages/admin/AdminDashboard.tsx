import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Phone, Plus, RefreshCw, Trophy, UserPlus, Users } from 'lucide-react';

import LeadFormDialog from '@/components/leads/LeadFormDialog';
import LeadsTable from '@/components/leads/LeadsTable';
import AvatarDialog from '@/components/ui/AvatarDialog';
import { PRIMARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import { fetchAdminAvatar, saveAdminAvatar } from '@/lib/avatars';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { fetchAdminDisplayName, type CompanySettings } from '@/lib/company';
import {
  deleteLead,
  downloadCsv,
  fetchLeads,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  leadsToCsv,
  updateLeadStatus,
  type Lead,
  type LeadStatus,
} from '@/lib/leads';
import CompanySettingsDialog from './CompanySettingsDialog';
import AgentPanel from './agent/AgentPanel';
import AdminSidebar, { type DashboardTab } from './dashboard/AdminSidebar';
import TeamManagement from './team/TeamManagement';
import LiveChatInbox from '@/components/inbox/LiveChatInbox';
import LeadsChart from './dashboard/LeadsChart';
import StatCard from './dashboard/StatCard';

type Filter = 'all' | LeadStatus;

const FILTERS: Filter[] = ['all', ...LEAD_STATUSES];

const FILTER_LABELS: Record<Filter, string> = { all: 'All', ...LEAD_STATUS_LABELS };

const TAB_HEADINGS: Record<DashboardTab, { title: string; subtitle: string }> = {
  leads: {
    title: 'Leads overview',
    subtitle: 'Track and update enquiries from the website chat.',
  },
  chat: {
    title: 'Live chat',
    subtitle: 'Reply to visitors who asked to talk with your team.',
  },
  team: {
    title: 'Team access',
    subtitle: 'Add team members, assign what they can do, and approve their first sign-in.',
  },
  agent: {
    title: 'AI Agent',
    subtitle: 'Configure how the website assistant answers visitors.',
  },
};

type AdminDashboardProps = { adminEmail: string; onSignOut: () => Promise<void> };

export default function AdminDashboard({ adminEmail, onSignOut }: AdminDashboardProps) {
  const { company, setCompany } = useCompanySettings();
  const [adminName, setAdminName] = useState('');
  const [adminAvatarUrl, setAdminAvatarUrl] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tab, setTab] = useState<DashboardTab>('leads');
  const [agentDirty, setAgentDirty] = useState(false);
  const [leadEditor, setLeadEditor] = useState<{ lead: Lead | null } | null>(null);

  const selectTab = (next: DashboardTab) => {
    if (next === tab) return;
    if (tab === 'agent' && agentDirty && !window.confirm('You have unsaved AI agent changes. Leave this tab anyway?')) {
      return;
    }
    setTab(next);
  };

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
    void load();
  }, [load]);

  useEffect(() => {
    fetchAdminDisplayName(adminEmail)
      .then(setAdminName)
      .catch(() => setAdminName(''));
    fetchAdminAvatar(adminEmail)
      .then(setAdminAvatarUrl)
      .catch(() => setAdminAvatarUrl(null));
  }, [adminEmail]);

  const handleSaved = (saved: { company: CompanySettings; adminName: string }) => {
    setCompany(saved.company);
    setAdminName(saved.adminName);
  };

  const statusCounts = useMemo(
    () =>
      Object.fromEntries(
        LEAD_STATUSES.map((status) => [status, leads.filter((lead) => lead.status === status).length]),
      ) as Record<LeadStatus, number>,
    [leads],
  );

  const visibleLeads = useMemo(
    () => (filter === 'all' ? leads : leads.filter((lead) => lead.status === filter)),
    [leads, filter],
  );

  const countFor = (value: Filter) => (value === 'all' ? leads.length : statusCounts[value]);

  const shareOfLeads = (count: number) =>
    leads.length ? `${Math.round((count / leads.length) * 100)}% of all leads` : 'No leads yet';

  const conversion = leads.length ? Math.round((statusCounts.won / leads.length) * 100) : 0;

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

  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`cupidcreativex-leads-${filter}-${date}.csv`, leadsToCsv(visibleLeads));
  };

  const heading = TAB_HEADINGS[tab];

  return (
    <div className="relative isolate min-h-dvh bg-brand-lavender/40 font-body text-brand-deep md:flex">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="fx-pulse-slow absolute -left-32 top-1/4 size-[28rem] rounded-full bg-brand-indigo/15 blur-[120px]" />
        <div className="fx-pulse-slow absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-brand-orange/15 blur-[120px]" />
      </div>
      <AdminSidebar
        tab={tab}
        onSelectTab={selectTab}
        companyName={company?.company_name ?? 'Leads'}
        logoUrl={company?.logo_url}
        adminLabel={adminName || adminEmail}
        avatarUrl={adminAvatarUrl}
        onOpenAvatar={() => setAvatarOpen(true)}
        settingsDisabled={!company}
        onOpenSettings={() => setSettingsOpen(true)}
        onSignOut={() => void onSignOut()}
      />

      {avatarOpen && (
        <AvatarDialog
          name={adminName || adminEmail}
          currentUrl={adminAvatarUrl}
          onSave={async (url) => {
            await saveAdminAvatar(adminEmail, url);
            setAdminAvatarUrl(url);
          }}
          onClose={() => setAvatarOpen(false)}
        />
      )}

      {settingsOpen && company && (
        <CompanySettingsDialog
          company={company}
          adminEmail={adminEmail}
          adminName={adminName}
          onClose={() => setSettingsOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header key={tab} className="fx-fade-up">
            <h1 className="fx-text-gradient font-display text-2xl font-bold leading-[1.2] sm:text-3xl">{heading.title}</h1>
            <p className="mt-1 text-sm text-brand-deep/70">{heading.subtitle}</p>
          </header>

          <div hidden={tab !== 'leads'} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <StatCard
                index={0}
                label="Total leads"
                value={leads.length}
                hint="All enquiries received"
                icon={Users}
                tone="deep"
              />
              <StatCard
                index={1}
                label="New"
                value={statusCounts.new}
                hint={shareOfLeads(statusCounts.new)}
                icon={UserPlus}
                tone="indigo"
              />
              <StatCard
                index={2}
                label="Contacted"
                value={statusCounts.contacted}
                hint={shareOfLeads(statusCounts.contacted)}
                icon={Phone}
                tone="amber"
              />
              <StatCard
                index={3}
                label="Won"
                value={statusCounts.won}
                hint={`${conversion}% conversion`}
                icon={Trophy}
                tone="emerald"
              />
            </div>

            <LeadsChart leads={leads} statusCounts={statusCounts} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="group" aria-label="Filter leads by status" className="flex flex-wrap gap-2">
                {FILTERS.map((value) => {
                  const active = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(value)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo ${
                        active
                          ? 'bg-gradient-to-br from-brand-deep to-brand-indigo text-white shadow-md shadow-brand-deep/25'
                          : 'bg-white text-brand-deep ring-1 ring-brand-indigo/15 hover:bg-brand-lavender'
                      }`}
                    >
                      {FILTER_LABELS[value]}
                      <span className={`ml-1.5 tabular-nums ${active ? 'text-white/75' : 'text-brand-deep/55'}`}>
                        {countFor(value)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setLeadEditor({ lead: null })} className={`${PRIMARY_BUTTON_CLASS} fx-btn fx-ring`}>
                <Plus className="size-4" aria-hidden="true" />
                Add lead
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={visibleLeads.length === 0}
                className="fx-btn fx-ring flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-brand-indigo ring-1 ring-brand-indigo/20 transition hover:-translate-y-0.5 hover:bg-brand-lavender hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              >
                <Download className="size-4" aria-hidden="true" />
                Export CSV
              </button>
              </div>
            </div>

            {actionError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Loading leads" />
              </div>
            ) : loadError ? (
              <div role="alert" className="fx-fade-up fx-neon flex flex-col items-center gap-3 rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-sm text-red-700">{loadError}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="fx-btn flex items-center gap-2 rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Try again
                </button>
              </div>
            ) : visibleLeads.length === 0 ? (
              <div className="fx-fade-up fx-neon fx-lift rounded-2xl bg-white p-10 text-center shadow-sm">
                <p className="font-display text-lg font-semibold">No leads here yet</p>
                <p className="mt-1 text-sm text-brand-deep/70">
                  New enquiries from the website chat will appear here.
                </p>
              </div>
            ) : (
              <LeadsTable
                leads={visibleLeads}
                savingId={savingId}
                canEdit
                canDelete
                onStatusChange={(id, status) => void changeStatus(id, status)}
                onEdit={(lead) => setLeadEditor({ lead })}
                onDelete={(lead) => void removeLead(lead)}
              />
            )}
          </div>

          {tab === 'chat' && <LiveChatInbox />}
          {tab === 'team' && <TeamManagement />}

          <div hidden={tab !== 'agent'}>
            <AgentPanel onDirtyChange={setAgentDirty} />
          </div>
        </div>
      </main>

      {leadEditor && (
        <LeadFormDialog
          lead={leadEditor.lead}
          onClose={() => setLeadEditor(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}