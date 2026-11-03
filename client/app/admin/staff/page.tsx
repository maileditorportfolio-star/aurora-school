'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users, Search, Plus, Trash2, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import type { StaffMember } from '@/types';
import { ConsoleHeader, EmptyState, Panel } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatDate, initials } from '@/lib/utils';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  employeeNo: '',
  designation: 'Teacher',
  qualification: '',
  joiningDate: '',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.staff
      .list(search ? { search } : {})
      .then(({ staff }) => setStaff(staff))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setFormOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setForm({
      ...emptyForm,
      name: member.name,
      email: member.email,
      phone: member.phone ?? '',
      employeeNo: member.profile?.employeeNo ?? '',
      designation: member.profile?.designation ?? 'Teacher',
      qualification: member.profile?.qualification ?? '',
      joiningDate: member.profile?.joiningDate?.slice(0, 10) ?? '',
    });
    setError(null);
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editing) {
        await api.staff.update(editing.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          designation: form.designation.trim(),
          qualification: form.qualification.trim() || null,
          joiningDate: form.joiningDate || null,
        });
      } else {
        await api.staff.create({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim() || null,
          employeeNo: form.employeeNo.trim() || undefined,
          designation: form.designation.trim(),
          qualification: form.qualification.trim() || null,
          joiningDate: form.joiningDate || null,
        });
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the staff member');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: StaffMember) => {
    if (!confirm(`Remove ${member.name}? Their login will be deleted.`)) return;
    try {
      await api.staff.remove(member.id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not remove staff member');
    }
  };

  return (
    <>
      <ConsoleHeader
        title="Teachers & staff"
        description="Full-time faculty with employee numbers, designations and qualifications. Portal logins are created here."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add staff
          </Button>
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or employee no…"
            aria-label="Search staff"
            className="h-11 w-full rounded-2xl border border-ink-200 bg-white ps-11 pe-4 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
          />
        </div>

        <Panel>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-100" />
              ))}
            </div>
          ) : staff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff found"
              hint="Add your first teacher to start assigning subjects."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    <th className="pb-3 pe-3">Staff</th>
                    <th className="pb-3 pe-3">Employee</th>
                    <th className="pb-3 pe-3">Designation</th>
                    <th className="pb-3 pe-3">Qualification</th>
                    <th className="pb-3 pe-3">Joined</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {staff.map((member) => (
                    <tr key={member.id}>
                      <td className="py-3 pe-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">
                            {initials(member.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-ink-800">{member.name}</p>
                            <p className="truncate text-[11px] text-ink-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pe-3 font-mono text-xs text-ink-500">
                        {member.profile?.employeeNo ?? '—'}
                      </td>
                      <td className="py-3 pe-3 text-ink-700">
                        {member.profile?.designation ?? '—'}
                      </td>
                      <td className="py-3 pe-3 max-w-56 truncate text-ink-600">
                        {member.profile?.qualification ?? '—'}
                      </td>
                      <td className="py-3 pe-3 text-ink-500">
                        {member.profile?.joiningDate ? formatDate(member.profile.joiningDate) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(member)}
                            aria-label="Edit staff member"
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(member)}
                            aria-label="Remove staff member"
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit staff member' : 'Add staff member'}
        description={
          editing
            ? 'Email and employee number are immutable.'
            : 'A teacher login is created with this email.'
        }
      >
        <form onSubmit={submit} className="grid gap-4">
          <Input
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          {!editing && (
            <>
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="text"
                hint="Minimum 8 characters — share securely"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Employee no"
              placeholder="Auto if blank"
              value={form.employeeNo}
              onChange={(e) => setForm({ ...form, employeeNo: e.target.value })}
              disabled={!!editing}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Designation"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
            <Input
              label="Joining date"
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
          </div>
          <Input
            label="Qualification"
            value={form.qualification}
            onChange={(e) => setForm({ ...form, qualification: e.target.value })}
          />

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Add staff member'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
