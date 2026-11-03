'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Eye, EyeOff, ShieldAlert, GraduationCap } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore, roleHome } from '@/store/auth';

/** Demo accounts seeded by `npm run seed`. Development convenience only. */
const DEMO_ACCOUNTS = [
  { label: 'Super admin', email: 'admin@aurora.school' },
  { label: 'Office admin', email: 'office@aurora.school' },
  { label: 'Teacher', email: 'arif@aurora.school' },
  { label: 'Student', email: 'student@aurora.school' },
  { label: 'Parent', email: 'parent@aurora.school' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Enter your email and password.');
      return;
    }

    try {
      await login(email.trim(), password);
      const user = useAuthStore.getState().user;
      router.replace(roleHome(user?.role));
    } catch {
      // Store already carries the message.
    }
  };

  const visibleError = localError || error;

  return (
    <AuthShell>
      <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-card">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-700 text-signal-300">
          <GraduationCap className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-brand-950">
          Sign in to Aurora School
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Admins and teachers use the same sign-in. Landed in the wrong place?{' '}
          <Link href="/" className="font-semibold text-brand-700 hover:text-brand-600">
            Back to school site
          </Link>
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@aurora.school"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="pe-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 end-3 grid place-items-center text-ink-400 transition hover:text-ink-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {visibleError && (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700"
            >
              <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
              {visibleError}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            <LogIn className="h-4 w-4" aria-hidden />
            {isLoading ? 'Signing you in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 border-t border-ink-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
            Demo accounts (password aurora123)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword('aurora123');
                }}
                className="rounded-full border border-ink-200 bg-frost px-3 py-1.5 text-[11px] font-medium text-ink-600 transition hover:border-brand-400 hover:text-brand-800"
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
