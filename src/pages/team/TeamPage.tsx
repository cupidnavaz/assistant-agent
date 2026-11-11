import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import TeamSignIn from './TeamSignIn';
import TeamPortal from './TeamPortal';

export default function TeamPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSignedIn(data.session !== null);
      })
      .catch(() => {
        if (active) setSignedIn(false);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (signedIn === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-lavender">
        <Loader2 className="size-6 animate-spin text-brand-indigo" aria-label="Loading" />
      </div>
    );
  }

  return signedIn ? <TeamPortal onSignOut={signOut} /> : <TeamSignIn />;
}
