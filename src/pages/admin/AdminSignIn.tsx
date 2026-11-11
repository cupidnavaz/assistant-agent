import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BrandMark from '@/components/chat/BrandMark';

type Mode = 'signin' | 'signup';

const INPUT_CLASS =
  'w-full rounded-xl border border-brand-indigo/20 bg-white px-3.5 py-2.5 text-[15px] text-brand-deep placeholder:text-brand-deep/40 focus:border-brand-indigo focus:outline-none focus:ring-2 focus:ring-brand-indigo/30';

export default function AdminSignIn() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const credentials = { email: email.trim(), password };
    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setSubmitting(false);
    if (authError) {
      setError(friendlyAuthError(authError.message, mode));
    }
  };

  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-brand-lavender px-4 py-12 font-body text-brand-deep">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="fx-pulse-slow absolute -left-32 top-1/4 size-[28rem] rounded-full bg-brand-indigo/25 blur-[120px]" />
        <div className="fx-pulse-slow absolute -right-32 bottom-1/4 size-[28rem] rounded-full bg-brand-orange/25 blur-[120px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fx-neon fx-ring w-full max-w-sm rounded-3xl bg-white p-8 shadow-[0_24px_64px_-16px_rgba(43,26,94,0.3)]"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark />
          <div>
            <h1 className="fx-heading fx-text-gradient font-display text-2xl font-bold leading-[1.2]">Leads admin</h1>
            <p className="mt-1 text-sm text-brand-deep/70">
              {mode === 'signin' ? 'Sign in to view your leads.' : 'Create the admin account.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="fx-btn fx-ring flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : mode === 'signin' ? (
              <LogIn className="size-4" aria-hidden="true" />
            ) : (
              <UserPlus className="size-4" aria-hidden="true" />
            )}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="mt-5 w-full text-center text-sm font-medium text-brand-indigo hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
        >
          {mode === 'signin' ? 'First time here? Create the admin account' : 'Already have an account? Sign in'}
        </button>
      </motion.div>
    </div>
  );
}

function friendlyAuthError(message: string, mode: Mode): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login')) return 'That email and password do not match.';
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Sign in instead.';
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return 'Network problem. Check your connection and try again.';
  }
  return mode === 'signin' ? 'Sign in failed. Please try again.' : 'Account creation failed. Please try again.';
}