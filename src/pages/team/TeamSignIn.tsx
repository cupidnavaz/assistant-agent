import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Loader2, LogIn, Send } from 'lucide-react';
import BrandMark from '@/components/chat/BrandMark';
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '@/components/ui/fieldStyles';
import { supabase } from '@/lib/supabase';
import { activateTeamAccount, requestActivation } from '@/lib/team';

type Mode = 'signin' | 'activate';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = 'Something went wrong. Please try again.';

export default function TeamSignIn() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const signIn = async () => {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      const invalid = authError.message.toLowerCase().includes('invalid login');
      setError(invalid ? 'That email and password do not match.' : 'Sign in failed. Please try again.');
    }
  };

  const activate = async () => {
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    await activateTeamAccount({ email, code: code.trim(), password });
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
      setNotice('Your password is set. Sign in to continue.');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signin') await signIn();
      else await activate();
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestCode = async () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter your team email address first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await requestActivation(email);
      setNotice('Request sent. Once your administrator approves it, they will share an activation code with you.');
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  const isActivate = mode === 'activate';

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
            <h1 className="fx-heading fx-text-gradient font-display text-2xl font-bold leading-[1.2]">
              {isActivate ? 'Activate your account' : 'Team sign in'}
            </h1>
            <p className="mt-1 text-sm text-brand-deep/70">
              {isActivate
                ? 'Enter the code your administrator shared and choose your password.'
                : 'Sign in to the team dashboard.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="team-login-email" className="mb-1 block text-sm font-medium">Email</label>
            <input
              id="team-login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {isActivate && (
            <div>
              <label htmlFor="team-activation-code" className="mb-1 block text-sm font-medium">Activation code</label>
              <input
                id="team-activation-code"
                required
                maxLength={8}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={`${INPUT_CLASS} font-mono tracking-[0.2em]`}
              />
            </div>
          )}

          <div>
            <label htmlFor="team-login-password" className="mb-1 block text-sm font-medium">
              {isActivate ? 'Choose a password' : 'Password'}
            </label>
            <input
              id="team-login-password"
              type="password"
              autoComplete={isActivate ? 'new-password' : 'current-password'}
              required
              minLength={isActivate ? 8 : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {isActivate && (
            <div>
              <label htmlFor="team-confirm-password" className="mb-1 block text-sm font-medium">Confirm password</label>
              <input
                id="team-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
          )}

          <button type="submit" disabled={submitting} className={`${PRIMARY_BUTTON_CLASS} fx-btn fx-ring w-full`}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <LogIn className="size-4" aria-hidden="true" />
            )}
            {isActivate ? 'Activate and sign in' : 'Sign in'}
          </button>
        </form>

        {isActivate && (
          <button
            type="button"
            onClick={() => void handleRequestCode()}
            disabled={submitting}
            className={`${SECONDARY_BUTTON_CLASS} fx-btn mt-3 w-full`}
          >
            <Send className="size-4" aria-hidden="true" />
            Request an activation code
          </button>
        )}

        <button
          type="button"
          onClick={() => switchMode(isActivate ? 'signin' : 'activate')}
          className="mt-5 w-full text-center text-sm font-medium text-brand-indigo transition hover:text-brand-deep focus-visible:outline-none focus-visible:underline"
        >
          {isActivate ? 'Already activated? Sign in' : 'First time here? Activate your account'}
        </button>

        <p className="mt-6 text-center text-xs text-brand-deep/60">
          Team accounts are created by an administrator. There is no public sign-up.
        </p>
      </motion.div>
    </div>
  );
}