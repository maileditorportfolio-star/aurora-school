'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserRound,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore, roleHome } from '@/store/auth';
import { api } from '@/lib/api';
import { ConsoleHeader, Panel } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Account page shared by every signed-in role. */
export default function AccountPage() {
  const router = useRouter();
  const { user, isLoading, setUser } = useAuthStore();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (user) setProfile({ name: user.name, phone: user.phone ?? '' });
    });
  }, [user]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-frost">
        <p className="text-sm text-ink-400">Checking your session…</p>
      </div>
    );
  }

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);
    setProfileMsg(null);
    try {
      const { user: updated } = await api.auth.updateProfile({
        name: profile.name.trim(),
        phone: profile.phone.trim() || null,
      });
      setUser(updated);
      setProfileMsg('Profile saved.');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordMsg(null);

    if (passwords.newPassword !== passwords.confirm) {
      setPasswordError('New passwords do not match.');
      setSavingPassword(false);
      return;
    }

    try {
      await api.auth.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      setPasswordMsg('Password updated.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-frost">
      <ConsoleHeader
        title="My account"
        description={`Signed in as ${user.email} · role ${user.role}`}
        actions={
          <Link
            href={roleHome(user.role)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to console
          </Link>
        }
      />

      <div className="grid gap-6 p-5 sm:p-8 xl:grid-cols-2">
        <Panel title="Profile">
          <form onSubmit={saveProfile} className="grid gap-4">
            <Input
              label="Full name"
              value={profile.name}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              required
            />
            <Input
              label="Phone"
              type="tel"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            />
            {profileError && (
              <p role="alert" className="flex items-center gap-2 text-xs font-medium text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {profileError}
              </p>
            )}
            {profileMsg && (
              <p
                role="status"
                className="flex items-center gap-2 text-xs font-medium text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                {profileMsg}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingProfile} variant="outline">
                <UserRound className="h-4 w-4" aria-hidden />
                Save profile
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Change password">
          <form onSubmit={savePassword} className="grid gap-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(event) =>
                setPasswords({ ...passwords, currentPassword: event.target.value })
              }
              required
            />
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              hint="Minimum 8 characters"
              value={passwords.newPassword}
              onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
              required
              minLength={8}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
              required
              minLength={8}
            />
            {passwordError && (
              <p role="alert" className="flex items-center gap-2 text-xs font-medium text-rose-600">
                <AlertCircle className="h-4 w-4" />
                {passwordError}
              </p>
            )}
            {passwordMsg && (
              <p
                role="status"
                className="flex items-center gap-2 text-xs font-medium text-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                {passwordMsg}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" loading={savingPassword} variant="outline">
                <KeyRound className="h-4 w-4" aria-hidden />
                Update password
              </Button>
            </div>
          </form>
        </Panel>

        <div className="flex items-start gap-3 rounded-3xl border border-ink-100 bg-white p-4 text-xs leading-6 text-ink-500 xl:col-span-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <p>
            If someone else knows your password, change it now and tell the office. Accounts are
            managed by the school — there is no self-registration, and password resets go through
            the office.
          </p>
        </div>
      </div>
    </div>
  );
}
