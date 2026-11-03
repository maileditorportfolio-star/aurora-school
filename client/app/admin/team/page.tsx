'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Save, UserCog } from 'lucide-react';
import { api } from '@/lib/api';
import type { AdminUser } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ALL_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions';
import { formatDate, initials } from '@/lib/utils';

const emptyForm = { name: '', email: '', password: '', permissions: [] as string[] };

export default function TeamPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.admin.team
      .list()
      .then(({ users }) => {
        setUsers(users);
        setDrafts(
          Object.fromEntries(
            users.filter((u) => u.role === 'ADMIN').map((u) => [u.id, u.permissions]),
          ),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load team'));
  };

  useEffect(load, []);

  const toggle = (list: string[], key: string) =>
    list.includes(key) ? list.filter((p) => p !== key) : [...list, key];

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await api.admin.team.create(form);
      setForm(emptyForm);
      setMessage('Admin created. Share the credentials securely.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create admin');
    } finally {
      setBusy(false);
    }
  };

  const save = async (id: string) => {
    setMessage(null);
    setError(null);
    try {
      await api.admin.team.update(id, { permissions: drafts[id] ?? [] });
      setMessage('Permissions updated.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update permissions');
    }
  };

  return (
    <>
      <ConsoleHeader
        title="Team & permissions"
        description="Super-admin only. Create standard admins and grant exactly the permissions they need — everything else stays locked."
      />

      <div className="grid gap-6 p-5 sm:p-8 xl:grid-cols-12">
        {/* Create admin */}
        <Panel className="xl:col-span-4" title="New admin account">
          <form onSubmit={create} className="space-y-3">
            <Input
              label="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Temporary password"
              type="text"
              hint="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                Permissions
              </p>
              <div className="max-h-52 space-y-1 overflow-y-auto pe-1">
                {ALL_PERMISSIONS.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 text-xs hover:bg-frost"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-brand-700"
                      checked={form.permissions.includes(key)}
                      onChange={() =>
                        setForm({ ...form, permissions: toggle(form.permissions, key) })
                      }
                    />
                    <span className="text-ink-700">{PERMISSION_LABELS[key] ?? key}</span>
                  </label>
                ))}
              </div>
            </div>
            {error && (
              <p role="alert" className="text-xs font-medium text-rose-600">
                {error}
              </p>
            )}
            {message && <p className="text-xs font-medium text-emerald-700">{message}</p>}
            <Button type="submit" loading={busy} className="w-full">
              <Plus className="h-4 w-4" aria-hidden />
              Create admin
            </Button>
          </form>
        </Panel>

        {/* Existing admins */}
        <Panel className="xl:col-span-8" title="Staff accounts">
          {users.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No admin accounts yet" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {users.map((user) => (
                <li key={user.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                        {initials(user.name)}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink-800">
                          {user.name}
                          {user.role === 'SUPER_ADMIN' && (
                            <span className="ms-2 rounded-full bg-signal-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-signal-800">
                              Super admin
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-ink-400">
                          {user.email} · joined {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                    {user.role === 'ADMIN' && (
                      <Button size="sm" variant="outline" onClick={() => save(user.id)}>
                        <Save className="h-4 w-4" aria-hidden />
                        Save
                      </Button>
                    )}
                  </div>

                  {user.role === 'ADMIN' && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ALL_PERMISSIONS.map((key) => {
                        const granted = (drafts[user.id] ?? []).includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user.id]: toggle(prev[user.id] ?? [], key),
                              }))
                            }
                            aria-pressed={granted}
                            className={
                              granted
                                ? 'rounded-full border border-brand-600 bg-brand-700 px-3 py-1 text-[10px] font-semibold text-white'
                                : 'rounded-full border border-ink-200 bg-white px-3 py-1 text-[10px] font-medium text-ink-500 transition hover:border-brand-400 hover:text-brand-700'
                            }
                            title={key}
                          >
                            {PERMISSION_LABELS[key] ?? key}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {user.role === 'SUPER_ADMIN' && (
                    <p className="mt-2 flex items-center gap-2 text-[11px] text-ink-400">
                      <UserCog className="h-3.5 w-3.5" />
                      Full access — cannot be restricted.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
