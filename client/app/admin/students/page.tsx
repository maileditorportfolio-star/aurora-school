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
import { StudentModals } from '@/components/students/student-modals';

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

      <StudentModals
        formOpen={formOpen}
        setFormOpen={setFormOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        formError={formError}
        saving={saving}
        submit={submit}
        flatSections={flatSections}
        detail={detail}
        setDetail={setDetail}
        invoices={invoices}
        accountPassword={accountPassword}
        setAccountPassword={setAccountPassword}
        createPortalLogin={createPortalLogin}
      />
      <StudentModals
        formOpen={formOpen}
        setFormOpen={setFormOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        formError={formError}
        saving={saving}
        submit={submit}
        flatSections={flatSections}
        detail={detail}
        setDetail={setDetail}
        invoices={invoices}
        accountPassword={accountPassword}
        setAccountPassword={setAccountPassword}
        createPortalLogin={createPortalLogin}
      />
    </>
  );
}
