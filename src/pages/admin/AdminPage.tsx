import { useCallback, useEffect, useState } from 'react';
import { Loader2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import TeamPortal from '@/pages/team/TeamPortal';
import AdminSignIn from './AdminSignIn';
import AdminDashboard from './AdminDashboard';

type AccessState = 'checking' | 'signed-out' | 'admin' | 'team' | 'error';

type Access = { state: AccessState; email: string | null };

const NO_ACCESS: Access = { state: 'error', email: null };

async function resolveAccess(): Promise<Access> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return NO_ACCESS;
  const session = sessionData.session;
  if (!session) return { state: 'signed-out', email: null };
  const email = session.user.email ?? null;
  const { data, error } = await supabase.rpc('is_lead_admin');
  if (error) return NO_ACCESS;
  return { state: data === true ? 'admin' : 'team', email };
}

export default function AdminPage() {
  const [access, setAccess] = useState<Access>({ state: 'checking', email: null });

  const refresh = useCallback(async () => {
    const next = await resolveAccess().catch((): Access => NO_ACCESS);
    setAccess(next);
  }, []);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setAccess(NO_ACCESS);
  };

  const state = access.state;

  if (state === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-lavender">
        <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Checking access" />
      </div>
    );
  }

  if (state === 'signed-out') return <AdminSignIn />;

  if (state === 'admin' && access.email) {
    return <AdminDashboard adminEmail={access.email} onSignOut={signOut} />;
  }

  if (state === 'team') return <TeamPortal onSignOut={signOut} />;

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-brand-lavender px-4 py-12 font-body text-brand-deep">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="fx-pulse-slow absolute -left-32 top-1/4 size-[28rem] rounded-full bg-brand-indigo/25 blur-[120px]" />
        <div className="fx-pulse-slow absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-brand-orange/25 blur-[120px]" />
      </div>
      <div className="fx-pop-in fx-neon w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_24px_64px_-16px_rgba(43,26,94,0.3)]">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-lavender text-brand-indigo">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold leading-[1.2]">Something went wrong</h1>
        <p className="mt-2 text-sm text-brand-deep/70">We could not check your access. Please try again.</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            className="fx-btn fx-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="fx-btn flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-brand-indigo transition hover:bg-brand-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}