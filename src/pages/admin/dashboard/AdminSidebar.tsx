import { motion } from 'framer-motion';
import { Camera, Inbox, LogOut, MessagesSquare, Settings, Sparkles, Users, type LucideIcon } from 'lucide-react';
import BrandMark from '@/components/chat/BrandMark';
import Avatar from '@/components/ui/Avatar';

export type DashboardTab = 'leads' | 'chat' | 'team' | 'agent';

const NAV_ITEMS: { id: DashboardTab; label: string; icon: LucideIcon }[] = [
  { id: 'leads', label: 'Leads', icon: Inbox },
  { id: 'chat', label: 'Live chat', icon: MessagesSquare },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'agent', label: 'AI Agent', icon: Sparkles },
];

type AdminSidebarProps = {
  tab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  companyName: string;
  logoUrl?: string | null;
  adminLabel: string;
  avatarUrl: string | null;
  onOpenAvatar: () => void;
  settingsDisabled: boolean;
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export default function AdminSidebar({
  tab,
  onSelectTab,
  companyName,
  logoUrl,
  adminLabel,
  avatarUrl,
  onOpenAvatar,
  settingsDisabled,
  onOpenSettings,
  onSignOut,
}: AdminSidebarProps) {
  return (
    <aside className="fx-fade-in bg-brand-deep text-white md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col">
      <div className="flex items-center gap-3 px-4 py-4 md:px-5 md:pb-5 md:pt-6">
        <BrandMark size="sm" logoUrl={logoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold leading-[1.2]">{companyName}</p>
          <p className="text-xs text-white/65">Admin console</p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          disabled={settingsDisabled}
          aria-label="Company settings"
          className="fx-btn flex size-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange disabled:opacity-40"
        >
          <Settings className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onSignOut}
          aria-label="Sign out"
          className="fx-btn flex size-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-4 md:pb-0">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectTab(id)}
              aria-current={active ? 'page' : undefined}
              className={`group relative flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
                active ? 'text-white' : 'fx-underline text-white/70 hover:text-white'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-nav-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/15 to-white/5 shadow-[0_8px_24px_-12px] shadow-brand-orange/60 ring-1 ring-white/15"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-brand-orange"
                />
              )}
              <Icon
                className="relative size-4 transition-transform duration-300 group-hover:scale-110"
                aria-hidden="true"
              />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <button
          type="button"
          onClick={onOpenAvatar}
          aria-label="Change profile photo"
          className="fx-ring group relative shrink-0 rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
        >
          <Avatar name={adminLabel} url={avatarUrl} size="md" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-brand-deep/60 opacity-0 transition group-hover:opacity-100">
            <Camera className="size-4 text-white" aria-hidden="true" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-xs text-white/65">Signed in as</p>
          <p className="mt-0.5 truncate text-sm text-white/85">{adminLabel}</p>
        </div>
      </div>
    </aside>
  );
}