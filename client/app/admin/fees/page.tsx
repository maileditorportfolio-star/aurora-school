'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Plus,
  Receipt,
  Printer,
  Search,
  Ban,
  Trash2,
  BadgePercent,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeeInvoice, FeeStructure, SchoolClass } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

type Tab = 'structures' | 'invoices' | 'generate';

const STATUS_STYLES: Record<FeeInvoice['status'], string> = {
  PENDING: 'bg-signal-100 text-signal-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  WAIVED: 'bg-ink-100 text-ink-500',
};

const FREQ_LABEL: Record<FeeStructure['frequency'], string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
  ONE_TIME: 'One-time',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function FeesPage() {
  const [tab, setTab] = useState<Tab>('invoices');
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [status, setStatus] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [structureFormOpen, setStructureFormOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [structureForm, setStructureForm] = useState({
    name: '',
    amount: '',
    frequency: 'MONTHLY' as FeeStructure['frequency'],
    classId: '',
    dueDay: '10',
  });
  const [structureError, setStructureError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [payTarget, setPayTarget] = useState<FeeInvoice | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', reference: '' });
  const [receiptInvoice, setReceiptInvoice] = useState<FeeInvoice | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [genForm, setGenForm] = useState({
    structureId: '',
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    sectionId: '',
  });
  const [genResult, setGenResult] = useState<string | null>(null);

  const sections = useMemo(
    () =>
      classes.flatMap((schoolClass) =>
        schoolClass.sections.map((s) => ({ id: s.id, label: `${schoolClass.name} ${s.name}` })),
      ),
    [classes],
  );

  const loadStructures = useCallback(() => {
    api.fees
      .structures()
      .then(({ structures }) => setStructures(structures))
      .catch(() => {});
  }, []);

  const loadInvoices = useCallback(() => {
    setLoading(true);
    api.fees
      .invoices({
        status: status || undefined,
        sectionId: sectionId || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      .then(({ invoices, pagination: page }) => {
        setInvoices(invoices);
        setPagination(page);
      })
      .finally(() => setLoading(false));
  }, [status, sectionId, pagination.page, pagination.limit]);

  useEffect(() => {
    loadStructures();
    api.classes
      .tree()
      .then(({ classes }) => setClasses(classes))
      .catch(() => {});
  }, [loadStructures]);

  useEffect(() => {
    Promise.resolve().then(loadInvoices);
  }, [loadInvoices]);

  const visibleInvoices = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return invoices;
    return invoices.filter((invoice) =>
      [
        invoice.invoiceNo,
        invoice.title,
        invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : '',
        invoice.student?.admissionNo ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [invoices, query]);

  const totals = useMemo(() => {
    const outstanding = invoices
      .filter((i) => i.status !== 'PAID' && i.status !== 'WAIVED')
      .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);
    return { outstanding };
  }, [invoices]);

  const openStructureForm = (structure?: FeeStructure) => {
    setEditingStructure(structure ?? null);
    setStructureForm(
      structure
        ? {
            name: structure.name,
            amount: String(structure.amount),
            frequency: structure.frequency,
            classId: structure.classId ?? '',
            dueDay: String(structure.dueDay ?? 10),
          }
        : { name: '', amount: '', frequency: 'MONTHLY', classId: '', dueDay: '10' },
    );
    setStructureError(null);
    setStructureFormOpen(true);
  };

  const saveStructure = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStructureError(null);
    const payload = {
      name: structureForm.name.trim(),
      amount: Number(structureForm.amount),
      frequency: structureForm.frequency,
      classId: structureForm.classId || null,
      dueDay: structureForm.frequency === 'MONTHLY' ? Number(structureForm.dueDay) || 10 : null,
    };
    try {
      if (!payload.name || !(payload.amount >= 0)) {
        setStructureError('Name and a non-negative amount are required.');
        setSaving(false);
        return;
      }
      if (editingStructure) {
        await api.fees.updateStructure(editingStructure.id, payload);
      } else {
        await api.fees.createStructure(payload);
      }
      setStructureFormOpen(false);
      loadStructures();
    } catch (err) {
      setStructureError(err instanceof Error ? err.message : 'Could not save the structure');
    } finally {
      setSaving(false);
    }
  };

  const openPayment = (invoice: FeeInvoice) => {
    setPayTarget(invoice);
    setPayForm({
      amount: String(Math.max(0, invoice.amount - invoice.paidAmount)),
      method: 'CASH',
      reference: '',
    });
  };

  const recordPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payTarget) return;
    const amount = Number(payForm.amount);
    if (!(amount > 0)) return;
    setSaving(true);
    setError(null);
    try {
      const { invoice } = await api.fees.addPayment(payTarget.id, {
        amount,
        method: payForm.method,
        reference: payForm.reference.trim() || undefined,
      });
      setPayTarget(null);
      setReceiptInvoice(invoice);
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  const waive = async (invoice: FeeInvoice) => {
    if (
      !confirm(
        `Waive ${invoice.invoiceNo} (${formatCurrency(invoice.amount)})? The family will no longer owe this.`,
      )
    )
      return;
    try {
      await api.fees.waiveInvoice(invoice.id);
      setMessage(`${invoice.invoiceNo} waived.`);
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not waive invoice');
    }
  };

  const removeInvoice = async (invoice: FeeInvoice) => {
    if (!confirm(`Delete ${invoice.invoiceNo}? Only unpaid invoices can be deleted.`)) return;
    try {
      await api.fees.removeInvoice(invoice.id);
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete invoice');
    }
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    setGenResult(null);
    setError(null);
    try {
      const structure = structures.find((row) => row.id === genForm.structureId);
      const { created, skipped, total } = await api.fees.generateInvoices({
        structureId: genForm.structureId,
        month: structure?.frequency === 'MONTHLY' ? Number(genForm.month) : null,
        year: structure?.frequency === 'MONTHLY' ? Number(genForm.year) : null,
        sectionId: genForm.sectionId || null,
      });
      setGenResult(
        `Generated ${created} invoice(s) · skipped ${skipped} already billed · ${total} students in scope.`,
      );
      loadInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    }
  };

  const exportCsv = () => {
    const header = [
      'Invoice',
      'Student',
      'Admission No',
      'Title',
      'Amount',
      'Paid',
      'Balance',
      'Due date',
      'Status',
    ];
    const rows = visibleInvoices.map((invoice) => [
      invoice.invoiceNo,
      invoice.student ? `${invoice.student.firstName} ${invoice.student.lastName}` : '',
      invoice.student?.admissionNo ?? '',
      invoice.title,
      invoice.amount,
      invoice.paidAmount,
      invoice.amount - invoice.paidAmount,
      formatDate(invoice.dueDate),
      invoice.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'aurora-invoices.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedStructure = structures.find((row) => row.id === genForm.structureId);

  return (
    <>
      <ConsoleHeader
        title="Fees & payments"
        description="Structures, monthly generation, collection and receipts. Balances update live across the portal."
        actions={
          <div className="flex items-center gap-2 text-right">
            <div className="hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider text-ink-400">
                Outstanding (this page)
              </p>
              <p className="font-display text-lg font-semibold text-rose-600">
                {formatCurrency(totals.outstanding)}
              </p>
            </div>
            <Wallet className="h-6 w-6 text-brand-600" aria-hidden />
          </div>
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        {/* Tabs */}
        <div
          className="flex flex-wrap gap-1 rounded-2xl border border-ink-100 bg-white p-1 shadow-soft"
          role="tablist"
          aria-label="Fee views"
        >
          {(
            [
              { id: 'invoices', label: 'Invoices' },
              { id: 'structures', label: 'Fee structures' },
              { id: 'generate', label: 'Bulk generate' },
            ] as Array<{ id: Tab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition',
                tab === item.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-brand-800',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {message}
          </p>
        )}

        {/* ---------- Invoices tab ---------- */}
        {tab === 'invoices' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:min-w-56">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  aria-hidden
                />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search invoice, student, admission no…"
                  aria-label="Search invoices"
                  className="h-11 w-full rounded-2xl border border-ink-200 bg-white ps-10 pe-3 text-sm outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                aria-label="Filter by status"
                className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none"
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
                <option value="WAIVED">Waived</option>
              </select>
              <select
                value={sectionId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                aria-label="Filter by section"
                className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none"
              >
                <option value="">All sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                CSV
              </Button>
            </div>

            <Panel>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-2xl bg-ink-100" />
                  ))}
                </div>
              ) : visibleInvoices.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No invoices"
                  hint="Generate invoices from a fee structure, or adjust the filters."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                        <th className="pb-3 pe-3">Invoice</th>
                        <th className="pb-3 pe-3">Student</th>
                        <th className="pb-3 pe-3">Title</th>
                        <th className="pb-3 pe-3 text-right">Amount</th>
                        <th className="pb-3 pe-3 text-right">Balance</th>
                        <th className="pb-3 pe-3">Due</th>
                        <th className="pb-3 pe-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {visibleInvoices.map((invoice) => {
                        const balance = invoice.amount - invoice.paidAmount;
                        return (
                          <tr key={invoice.id}>
                            <td className="py-2.5 pe-3 font-mono text-xs text-ink-500">
                              {invoice.invoiceNo}
                            </td>
                            <td className="py-2.5 pe-3">
                              <p className="font-semibold text-ink-800">
                                {invoice.student
                                  ? `${invoice.student.firstName} ${invoice.student.lastName}`
                                  : '—'}
                              </p>
                              <p className="font-mono text-[10px] text-ink-400">
                                {invoice.student?.admissionNo ?? ''}
                              </p>
                            </td>
                            <td
                              className="py-2.5 pe-3 max-w-48 truncate text-ink-600"
                              title={invoice.title}
                            >
                              {invoice.title}
                            </td>
                            <td className="py-2.5 pe-3 text-right tabular-nums">
                              {formatCurrency(invoice.amount)}
                            </td>
                            <td className="py-2.5 pe-3 text-right font-semibold tabular-nums">
                              {formatCurrency(balance)}
                            </td>
                            <td className="py-2.5 pe-3 text-ink-500">
                              {formatDate(invoice.dueDate)}
                            </td>
                            <td className="py-2.5 pe-3">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                  STATUS_STYLES[invoice.status],
                                  invoice.isOverdue && 'bg-rose-100 text-rose-700',
                                )}
                              >
                                {invoice.isOverdue ? 'Overdue' : invoice.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <div className="flex justify-end gap-1">
                                {invoice.status !== 'PAID' && invoice.status !== 'WAIVED' && (
                                  <button
                                    onClick={() => openPayment(invoice)}
                                    aria-label="Record payment"
                                    title="Record payment"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                                  >
                                    <Receipt className="h-4 w-4" />
                                  </button>
                                )}
                                {invoice.status !== 'PAID' && invoice.status !== 'WAIVED' && (
                                  <button
                                    onClick={() => waive(invoice)}
                                    aria-label="Waive invoice"
                                    title="Waive"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-signal-50 hover:text-signal-700"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </button>
                                )}
                                {invoice.status === 'PAID' && (
                                  <button
                                    onClick={() => setReceiptInvoice(invoice)}
                                    aria-label="View receipt"
                                    title="View receipt"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                                  >
                                    <Printer className="h-4 w-4" />
                                  </button>
                                )}
                                {invoice.payments?.length === 0 && invoice.paidAmount === 0 && (
                                  <button
                                    onClick={() => removeInvoice(invoice)}
                                    aria-label="Delete invoice"
                                    title="Delete"
                                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {pagination.pages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500">
                  <span>
                    {pagination.total} invoices · page {pagination.page} of {pagination.pages}
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
          </>
        )}

        {/* ---------- Structures tab ---------- */}
        {tab === 'structures' && (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => openStructureForm()}>
                <Plus className="h-4 w-4" />
                New structure
              </Button>
            </div>
            {structures.length === 0 ? (
              <EmptyState
                icon={BadgePercent}
                title="No fee structures"
                hint="Create Tuition, Development, Admission or Exam fees first."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {structures.map((structure) => (
                  <div
                    key={structure.id}
                    className="flex flex-col rounded-3xl border border-ink-100 bg-white p-5 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
                          {FREQ_LABEL[structure.frequency]}
                        </span>
                        <h3 className="mt-2 font-display text-lg font-semibold text-brand-950">
                          {structure.name}
                        </h3>
                        <p className="text-[11px] text-ink-400">
                          {structure.schoolClass ? structure.schoolClass.name : 'All classes'}
                          {structure.dueDay ? ` · due day ${structure.dueDay}` : ''} ·{' '}
                          {structure._count?.invoices ?? 0} invoices issued
                        </p>
                      </div>
                      <p className="font-display text-2xl font-semibold text-brand-900">
                        {formatCurrency(structure.amount)}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end gap-2 border-t border-ink-100 pt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStructureForm(structure)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete “${structure.name}”? Existing invoices keep their reference removed.`,
                            )
                          ) {
                            api.fees.removeStructure(structure.id).then(loadStructures);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ---------- Generate tab ---------- */}
        {tab === 'generate' && (
          <Panel title="Generate invoices in bulk">
            <form onSubmit={generate} className="grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="structure"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                >
                  Fee structure
                </label>
                <select
                  id="structure"
                  value={genForm.structureId}
                  onChange={(e) => setGenForm({ ...genForm, structureId: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select a structure…</option>
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatCurrency(s.amount)} ({FREQ_LABEL[s.frequency]})
                    </option>
                  ))}
                </select>
              </div>
              {selectedStructure?.frequency === 'MONTHLY' && (
                <>
                  <div>
                    <label
                      htmlFor="gen-month"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                    >
                      Month
                    </label>
                    <select
                      id="gen-month"
                      value={genForm.month}
                      onChange={(e) => setGenForm({ ...genForm, month: e.target.value })}
                      className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                    >
                      {MONTHS.map((label, index) => (
                        <option key={label} value={index + 1}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Year"
                    type="number"
                    value={genForm.year}
                    onChange={(e) => setGenForm({ ...genForm, year: e.target.value })}
                  />
                </>
              )}
              <div>
                <label
                  htmlFor="gen-section"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                >
                  Limit to section (optional)
                </label>
                <select
                  id="gen-section"
                  value={genForm.sectionId}
                  onChange={(e) => setGenForm({ ...genForm, sectionId: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">Everyone matching the structure</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
                <p className="max-w-md text-[11px] leading-5 text-ink-400">
                  Creates one invoice per active student. Students already billed for the same
                  structure and month/year are skipped automatically.
                </p>
                <Button type="submit" disabled={!genForm.structureId}>
                  <Wand2 className="h-4 w-4" />
                  Generate
                </Button>
              </div>
              {genResult && (
                <p
                  role="status"
                  className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800"
                >
                  {genResult}
                </p>
              )}
            </form>
          </Panel>
        )}
      </div>

      {/* Structure modal */}
      <Modal
        open={structureFormOpen}
        onClose={() => setStructureFormOpen(false)}
        title={editingStructure ? 'Edit fee structure' : 'New fee structure'}
      >
        <form onSubmit={saveStructure} className="grid gap-4">
          <Input
            label="Name"
            placeholder="Tuition Fee"
            value={structureForm.name}
            onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (৳)"
              type="number"
              min={0}
              value={structureForm.amount}
              onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
              required
            />
            <div>
              <label
                htmlFor="freq"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Frequency
              </label>
              <select
                id="freq"
                value={structureForm.frequency}
                onChange={(e) =>
                  setStructureForm({
                    ...structureForm,
                    frequency: e.target.value as FeeStructure['frequency'],
                  })
                }
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annual</option>
                <option value="ONE_TIME">One-time</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="scope"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Class scope
              </label>
              <select
                id="scope"
                value={structureForm.classId}
                onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })}
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="">All classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>
            {structureForm.frequency === 'MONTHLY' && (
              <Input
                label="Due day of month"
                type="number"
                min={1}
                max={28}
                value={structureForm.dueDay}
                onChange={(e) => setStructureForm({ ...structureForm, dueDay: e.target.value })}
              />
            )}
          </div>
          {structureError && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {structureError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setStructureFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        title="Record payment"
        description={payTarget ? `${payTarget.invoiceNo} · ${payTarget.title}` : undefined}
      >
        {payTarget && (
          <form onSubmit={recordPayment} className="grid gap-4">
            <div className="rounded-2xl bg-frost p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-400">Billed</span>
                <span className="tabular-nums">{formatCurrency(payTarget.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Paid so far</span>
                <span className="tabular-nums">{formatCurrency(payTarget.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-ink-800">
                <span>Balance</span>
                <span className="tabular-nums">
                  {formatCurrency(payTarget.amount - payTarget.paidAmount)}
                </span>
              </div>
            </div>
            <Input
              label="Amount (৳)"
              type="number"
              min={1}
              step="0.01"
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              required
            />
            <div>
              <label
                htmlFor="method"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Method
              </label>
              <select
                id="method"
                value={payForm.method}
                onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank transfer</option>
              </select>
            </div>
            <Input
              label="Reference (optional)"
              placeholder="bKash trx id…"
              value={payForm.reference}
              onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setPayTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                Record payment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt modal */}
      <Modal
        open={!!receiptInvoice}
        onClose={() => setReceiptInvoice(null)}
        title="Payment receipt"
      >
        {receiptInvoice && (
          <div className="text-sm">
            <div className="rounded-2xl border border-ink-100 p-4">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <div>
                  <p className="font-display text-lg font-semibold text-brand-950">Aurora School</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400">
                    Money receipt
                  </p>
                </div>
                <Receipt className="h-6 w-6 text-brand-600" aria-hidden />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-ink-400">Invoice</dt>
                <dd className="font-mono">{receiptInvoice.invoiceNo}</dd>
                <dt className="text-ink-400">Student</dt>
                <dd>
                  {receiptInvoice.student
                    ? `${receiptInvoice.student.firstName} ${receiptInvoice.student.lastName}`
                    : '—'}
                </dd>
                <dt className="text-ink-400">Title</dt>
                <dd>{receiptInvoice.title}</dd>
                <dt className="text-ink-400">Amount paid</dt>
                <dd className="font-semibold">{formatCurrency(receiptInvoice.paidAmount)}</dd>
                <dt className="text-ink-400">Balance</dt>
                <dd>{formatCurrency(receiptInvoice.amount - receiptInvoice.paidAmount)}</dd>
              </dl>
            </div>
            {receiptInvoice.payments && receiptInvoice.payments.length > 0 && (
              <table className="mt-3 w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-ink-400">
                    <th className="pb-1">Date</th>
                    <th className="pb-1">Method</th>
                    <th className="pb-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {receiptInvoice.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-1.5">{formatDate(payment.createdAt)}</td>
                      <td className="py-1.5">
                        {payment.method}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 flex justify-end gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button size="sm" onClick={() => setReceiptInvoice(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
