import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import type { FeeInvoice, SchoolClass, Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { KeyRound, Pencil, UserRound, Archive } from 'lucide-react';
import { Plus } from 'lucide-react';

interface FlatSection {
  id: string;
  label: string;
  className: string;
}

export interface StudentModalsProps {
  formOpen: boolean;
  setFormOpen: (v: boolean) => void;
  editing: Student | null;
  form: any;
  setForm: (v: any) => void;
  formError: string | null;
  saving: boolean;
  submit: (e: React.FormEvent) => void;
  flatSections: FlatSection[];
  detail: Student | null;
  setDetail: (v: Student | null) => void;
  invoices: FeeInvoice[];
  accountPassword: string;
  setAccountPassword: (v: string) => void;
  createPortalLogin: () => void;
}

export function StudentModals(props: StudentModalsProps) {
  const {
    formOpen,
    setFormOpen,
    editing,
    form,
    setForm,
    formError,
    saving,
    submit,
    flatSections,
    detail,
    setDetail,
    invoices,
    accountPassword,
    setAccountPassword,
    createPortalLogin,
  } = props;

  const STATUS_STYLES: Record<Student['status'], string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    GRADUATED: 'bg-brand-50 text-brand-800',
    TRANSFERRED: 'bg-signal-50 text-signal-800',
    DROPPED: 'bg-rose-50 text-rose-600',
  };

  return (
    <>
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

      {/* Detail modal */}
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
