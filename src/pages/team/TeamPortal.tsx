import { useCallback, useEffect, useState } from 'react';
import { Loader2, LogOut, RefreshCw, ShieldAlert, Clock } from 'lucide-react';
import { SECONDARY_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import { fetchOwnTeamMember, TEAM_STATUS_LABELS, type TeamMember } from '@/lib/team';
import TeamDashboard from './TeamDashboard';

type PortalState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'none' }
  | { status: 'ready'; member: TeamMember };

type TeamPortalProps = { onSignOut: () => Promise<void> };

export default function TeamPortal({ onSignOut }: TeamPortalProps) {
  const [state, setState] = useState<PortalState>({ status: 'loading' });

  const resolve = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const member = await fetchOwnTeamMember();
      setState(member ? { status: 'ready', member } : { status: 'none' });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-lavender">
        <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Checking team access" />
      </div>
    );
  }

  if (state.status === 'ready' && state.member.status === 'active') {
    return <TeamDashboard member={state.member} onSignOut={onSignOut} />;
  }

  const notice =
    state.status === 'ready'
      ? {
          icon: Clock,
          title: `Your access is ${TEAM_STATUS_LABELS[state.member.status].toLowerCase()}`,
          body:
            state.member.status === 'awaiting_approval'
              ? 'Your administrator still needs to approve your account. They will share an activation code with you.'
              : 'Your account is not active yet. Ask your administrator for an activation code.',
        }
      : state.status === 'none'
        ? {
            icon: ShieldAlert,
            title: 'No team access',
            body: 'This account is not on the team. Ask an administrator to add you.',
          }
        : {
            icon: ShieldAlert,
            title: 'Something went wrong',
            body: 'We could not check your access. Please try again.',
          };

  const Icon = notice.icon;

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-brand-lavender px-4 py-12 font-body text-brand-deep">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="fx-pulse-slow absolute -left-32 top-1/4 size-[28rem] rounded-full bg-brand-indigo/25 blur-[120px]" />
        <div className="fx-pulse-slow absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-brand-orange/25 blur-[120px]" />
      </div>
      <div className="fx-pop-in fx-neon w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_24px_64px_-16px_rgba(43,26,94,0.3)]">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-lavender text-brand-indigo">
          <Icon className="size-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold leading-[1.2]">{notice.title}</h1>
        <p className="mt-2 text-sm text-brand-deep/70">{notice.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          {state.status === 'error' && (
            <button type="button" onClick={() => void resolve()} className={`${PRIMARY_BUTTON_CLASS} fx-btn fx-ring`}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          )}
          <button type="button" onClick={() => void onSignOut()} className={`${SECONDARY_BUTTON_CLASS} fx-btn`}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}