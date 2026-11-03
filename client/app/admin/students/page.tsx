'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Search,
  Plus,
  Download,
  Pencil,
  Archive,
  KeyRound,
  UserRound,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeeInvoice, SchoolClass, Student } from '@/types';
import { ConsoleHeader, EmptyState, Panel } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils';

interface FlatSection {
  id: string;
  label: string;
  className: string;
}

const STATUS_STYLES: Record<Student['status'], string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  GRADUATED: 'bg-brand-50 text-brand-800',
  TRANSFERRED: 'bg-signal-50 text-signal-800',
  DROPPED: 'bg-rose-50 text-rose-600',
};

const emptyForm = {
  admissionNo: '',
  firstName: '',
  lastName: '',
  gender: 'MALE' as Student['gender'],
  dateOfBirth: '',
  bloodGroup: '',
  address: '',
  sectionId: '',
  rollNumber: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: 'FATHER',
  guardianEmail: '',
};

export default function StudentsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [accountPassword, setAccountPassword] = useState('');

  const flatSections = useMemo<FlatSection[]>(
    () =>
      classes.flatMap((schoolClass) =>
        schoolClass.sections.map((section) => ({
          id: section.id,
          label: `${schoolClass.name} ${section.name}`,
          className: schoolClass.name,
        })),
      ),
    [classes],
  );

  useEffect(() => {
    api.classes
      .tree()
      .then(({ classes }) => setClasses(classes))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.students
      .list({
        search: search || undefined,
        sectionId: sectionId || undefined,
        status: status || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      .then(({ students, pagination: page }) => {
        setStudents(students);
        setPagination(page);
      })
      .finally(() => setLoading(false));
  }, [search, sectionId, status, pagination.page, pagination.limit]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    setForm({
      ...emptyForm,
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth?.slice(0, 10) ?? '',
      bloodGroup: student.bloodGroup ?? '',
      address: student.address ?? '',
      sectionId: student.sectionId ?? student.section?.id ?? '',
      rollNumber: student.rollNumber != null ? String(student.rollNumber) : '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload: Record<string, unknown> = {
      admissionNo: form.admissionNo.trim() || undefined,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || null,
      bloodGroup: form.bloodGroup.trim() || null,
      address: form.address.trim() || null,
      sectionId: form.sectionId || null,
      rollNumber: form.rollNumber ? Number(form.rollNumber) : null,
    };
    if (form.guardianName.trim()) {
      payload.guardian = {
        name: form.guardianName.trim(),
        relation: form.guardianRelation,
        phone: form.guardianPhone.trim(),
        email: form.guardianEmail.trim() || null,
        isPrimary: true,
      };
    }

    try {
      if (editing) {
        delete payload.admissionNo;
        delete payload.guardian;
        await api.students.update(editing.id, payload);
      } else {
        await api.students.create(payload);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the student');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (student: Student) => {
    setDetail(student);
    setInvoices([]);
    api.fees
      .invoices({ studentId: student.id, limit: 5 })
      .then(({ invoices }) => setInvoices(invoices))
      .catch(() => {});
  };

  const exportCsv = () => {
    const header = [
      'Admission No',
      'Name',
      'Gender',
      'Class',
      'Section',
      'Roll',
      'Status',
      'Guardian',
      'Phone',
    ];
    const rows = students.map((student) => [
      student.admissionNo,
      `${student.firstName} ${student.lastName}`,
      student.gender,
      student.section?.class?.name ?? '',
      student.section?.name ?? '',
      student.rollNumber ?? '',
      student.status,
      student.guardians?.find((g) => g.isPrimary)?.name ?? '',
      student.guardians?.find((g) => g.isPrimary)?.phone ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aurora-students.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const createPortalLogin = async () => {
    if (!detail || accountPassword.length < 8) return;
    try {
      const { email } = await api.students.createAccount(detail.id, { password: accountPassword });
      setAccountPassword('');
      alert(`Portal login created: ${email}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not create login');
    }
  };

  return (
    <>
      <ConsoleHeader
        title="Students"
        description="Admit, search, promote and support every student — with guardians and portal logins in one place."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" aria-hidden />
              CSV
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Admit student
            </Button>
          </>
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:min-w-64">
            <Search
              className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Search name or admission no…"
              aria-label="Search students"
              className="h-11 w-full rounded-2xl border border-ink-200 bg-white ps-11 pe-4 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
            />
          </div>
          <select
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            aria-label="Filter by class and section"
            className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500"
          >
            <option value="">All classes</option>
            {flatSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            aria-label="Filter by status"
            className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="GRADUATED">Graduated</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="DROPPED">Dropped</option>
          </select>
        </div>

        {/* Table */}
        <Panel>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-2xl bg-ink-100" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No students match"
              hint="Adjust the filters, or admit a new student."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  Admit student
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    <th className="pb-3 pe-3">Student</th>
                    <th className="pb-3 pe-3">Admission</th>
                    <th className="pb-3 pe-3">Class</th>
                    <th className="pb-3 pe-3">Roll</th>
                    <th className="pb-3 pe-3">Guardian</th>
                    <th className="pb-3 pe-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {students.map((student) => {
                    const primary = student.guardians?.find((g) => g.isPrimary);
                    return (
                      <tr key={student.id} className="align-middle">
                        <td className="py-3 pe-3">
                          <button
                            onClick={() => openDetail(student)}
                            className="flex items-center gap-3 text-left"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800">
                              {initials(`${student.firstName} ${student.lastName}`)}
                            </span>
                            <span className="font-semibold text-ink-800 hover:text-brand-800">
                              {student.firstName} {student.lastName}
                            </span>
                          </button>
                        </td>
                        <td className="py-3 pe-3 font-mono text-xs text-ink-500">
                          {student.admissionNo}
                        </td>
                        <td className="py-3 pe-3 text-ink-700">
                          {student.section
                            ? `${student.section.class?.name ?? ''} ${student.section.name}`
                            : '—'}
                        </td>
                        <td className="py-3 pe-3 text-ink-700">{student.rollNumber ?? '—'}</td>
                        <td className="py-3 pe-3 text-ink-600">{primary?.name ?? '—'}</td>
                        <td className="py-3 pe-3">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                              STATUS_STYLES[student.status],
                            )}
                          >
                            {student.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => openEdit(student)}
                              aria-label="Edit student"
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDetail(student)}
                              aria-label="Student details"
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                            >
                              <UserRound className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  !confirm(
                                    `Archive ${student.firstName} ${student.lastName}? They will be marked DROPPED.`,
                                  )
                                )
                                  return;
                                await api.students.archive(student.id);
                                load();
                              }}
                              aria-label="Archive student"
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500">
              <span>
                {pagination.total} students · page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Create / edit modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit student' : 'Admit a new student'}
        wide
      >
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          {!editing && (
            <Input
              label="Admission no (optional)"
              placeholder="Auto-generated if blank"
              value={form.admissionNo}
              onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
            />
          )}
          <Input
            label="First name"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
          <Input
            label="Last name"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              htmlFor="gender"
            >
              Gender
            </label>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Student['gender'] })}
              className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <Input
            label="Date of birth"
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />
          <Input
            label="Blood group"
            placeholder="e.g. A+"
            value={form.bloodGroup}
            onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
          />
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              htmlFor="section"
            >
              Class & section
            </label>
            <select
              id="section"
              value={form.sectionId}
              onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
              className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Unassigned</option>
              {flatSections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Roll number"
            type="number"
            min={1}
            value={form.rollNumber}
            onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {!editing && (
            <fieldset className="sm:col-span-2 rounded-2xl border border-ink-100 bg-frost p-4">
              <legend className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                Primary guardian (optional)
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Guardian name"
                  value={form.guardianName}
                  onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={form.guardianPhone}
                  onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })}
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Relation
                  </label>
                  <select
                    value={form.guardianRelation}
                    onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}
                    className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="GUARDIAN">Guardian</option>
                  </select>
                </div>
                <Input
                  label="Email (for parent portal)"
                  type="email"
                  value={form.guardianEmail}
                  onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })}
                />
              </div>
            </fieldset>
          )}

          {formError && (
            <p
              role="alert"
              className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {formError}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Admit student'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail drawer */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.firstName} ${detail.lastName}` : ''}
        description={
          detail
            ? `${detail.admissionNo} · ${detail.section?.class?.name ?? 'Unassigned'} ${detail.section?.name ?? ''}`
            : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-2xl bg-frost p-3">
                <p className="text-ink-400">Gender</p>
                <p className="mt-0.5 font-semibold text-ink-800">{detail.gender}</p>
              </div>
              <div className="rounded-2xl bg-frost p-3">
                <p className="text-ink-400">Roll</p>
                <p className="mt-0.5 font-semibold text-ink-800">{detail.rollNumber ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-frost p-3">
                <p className="text-ink-400">Blood group</p>
                <p className="mt-0.5 font-semibold text-ink-800">{detail.bloodGroup ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-frost p-3">
                <p className="text-ink-400">Admitted</p>
                <p className="mt-0.5 font-semibold text-ink-800">
                  {formatDate(detail.admissionDate)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                Guardians
              </p>
              <ul className="mt-2 space-y-2">
                {detail.guardians?.map((guardian) => (
                  <li
                    key={guardian.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 px-3 py-2 text-xs"
                  >
                    <span>
                      <span className="font-semibold text-ink-800">{guardian.name}</span>
                      <span className="text-ink-400">
                        {' '}
                        · {guardian.relation} · {guardian.phone}
                      </span>
                    </span>
                    {guardian.isPrimary && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold uppercase text-brand-800">
                        Primary
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                Recent invoices
              </p>
              <ul className="mt-2 space-y-2">
                {invoices.length === 0 && (
                  <li className="text-xs text-ink-400">No invoices yet.</li>
                )}
                {invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 px-3 py-2 text-xs"
                  >
                    <span className="truncate text-ink-700">{invoice.title}</span>
                    <span className="shrink-0 font-semibold text-ink-800">
                      {formatCurrency(invoice.amount - invoice.paidAmount)} due
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-800">
                <KeyRound className="h-3.5 w-3.5" />
                Portal login
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="New password (8+ chars)"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-brand-200 bg-white px-3 text-xs outline-none focus:border-brand-500"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={createPortalLogin}
                  disabled={accountPassword.length < 8}
                >
                  Create
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-ink-400">
                Creates (or links) a STUDENT login using the admission-number email if none exists.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
