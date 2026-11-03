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

import { STATUS_STYLES, FREQ_LABEL, MONTHS } from '@/components/fees/fee-constants';
import { FeeModals } from '@/components/fees/fee-modals';
import { FeeTabs } from '@/components/fees/fee-tabs';

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

  const ctx = {
    tab,
    setTab,
    structures,
    invoices,
    pagination,
    classes,
    status,
    setStatus,
    sectionId,
    setSectionId,
    query,
    setQuery,
    loading,
    error,
    message,
    setError,
    setMessage,
    setPagination,
    setStructureFormOpen,
    setEditingStructure,
    setStructureForm,
    setStructureError,
    setPayTarget,
    setPayForm,
    setReceiptInvoice,
    setGenForm,
    setGenResult,
    genForm,
    genResult,
    saving,
    setSaving,
    structureFormOpen,
    editingStructure,
    structureForm,
    structureError,
    payTarget,
    payForm,
    receiptInvoice,
    loadStructures,
    loadInvoices,
    exportCsv,
    openStructureForm,
    saveStructure,
    openPayment,
    recordPayment,
    waive,
    removeInvoice,
    generate,
    selectedStructure,
    sections,
    visibleInvoices,
    totals,
  };

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
        {' '}
        <FeeTabs ctx={ctx} />
      </div>

      <FeeModals
        structureFormOpen={structureFormOpen}
        setStructureFormOpen={setStructureFormOpen}
        editingStructure={editingStructure}
        structureForm={structureForm}
        setStructureForm={setStructureForm}
        structureError={structureError}
        saving={saving}
        saveStructure={saveStructure}
        classes={classes}
        payTarget={payTarget}
        setPayTarget={setPayTarget}
        payForm={payForm}
        setPayForm={setPayForm}
        recordPayment={recordPayment}
        receiptInvoice={receiptInvoice}
        setReceiptInvoice={setReceiptInvoice}
      />
    </>
  );
}
