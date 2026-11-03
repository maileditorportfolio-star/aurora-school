import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FeeInvoice, FeeStructure, SchoolClass } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { BadgePercent, Receipt, Printer, Ban, Trash2, Wallet } from 'lucide-react';
import { STATUS_STYLES, FREQ_LABEL } from './fee-constants';

export interface FeeModalsProps {
  // structure modal
  structureFormOpen: boolean;
  setStructureFormOpen: (v: boolean) => void;
  editingStructure: FeeStructure | null;
  structureForm: { name: string; amount: string; frequency: FeeStructure['frequency']; classId: string; dueDay: string };
  setStructureForm: (v: any) => void;
  structureError: string | null;
  saving: boolean;
  saveStructure: (e: React.FormEvent) => void;
  classes: SchoolClass[];
  // payment modal
  payTarget: FeeInvoice | null;
  setPayTarget: (v: FeeInvoice | null) => void;
  payForm: { amount: string; method: string; reference: string };
  setPayForm: (v: any) => void;
  recordPayment: (e: React.FormEvent) => void;
  // receipt modal
  receiptInvoice: FeeInvoice | null;
  setReceiptInvoice: (v: FeeInvoice | null) => void;
}

export function FeeModals(props: FeeModalsProps) {
  const {
    structureFormOpen,
    setStructureFormOpen,
    editingStructure,
    structureForm,
    setStructureForm,
    structureError,
    saving,
    saveStructure,
    classes,
    payTarget,
    setPayTarget,
    payForm,
    setPayForm,
    recordPayment,
    receiptInvoice,
    setReceiptInvoice,
  } = props;

  return (
    <>
      {/* Structure modal */}
      <Modal open={structureFormOpen} onClose={() => setStructureFormOpen(false)} title={editingStructure ? 'Edit fee structure' : 'New fee structure'}>
        <form onSubmit={saveStructure} className="grid gap-4">
          <Input label="Name" placeholder="Tuition Fee" value={structureForm.name} onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (৳)" type="number" min={0} value={structureForm.amount} onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })} required />
            <div>
              <label htmlFor="freq" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500">Frequency</label>
              <select id="freq" value={structureForm.frequency} onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value as FeeStructure['frequency'] })} className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500">
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annual</option>
                <option value="ONE_TIME">One-time</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="scope" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500">Class scope</label>
              <select id="scope" value={structureForm.classId} onChange={(e) => setStructureForm({ ...structureForm, classId: e.target.value })} className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500">
                <option value="">All classes</option>
                {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
              </select>
            </div>
            {structureForm.frequency === 'MONTHLY' && (
              <Input label="Due day of month" type="number" min={1} max={28} value={structureForm.dueDay} onChange={(e) => setStructureForm({ ...structureForm, dueDay: e.target.value })} />
            )}
          </div>
          {structureError && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{structureError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setStructureFormOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save structure</Button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title="Record payment" description={payTarget ? `${payTarget.invoiceNo} · ${payTarget.title}` : undefined}>
        {payTarget && (
          <form onSubmit={recordPayment} className="grid gap-4">
            <div className="rounded-2xl bg-frost p-3 text-xs">
              <div className="flex justify-between"><span className="text-ink-400">Billed</span><span className="tabular-nums">{formatCurrency(payTarget.amount)}</span></div>
              <div className="flex justify-between"><span className="text-ink-400">Paid so far</span><span className="tabular-nums">{formatCurrency(payTarget.paidAmount)}</span></div>
              <div className="flex justify-between font-semibold text-ink-800"><span>Balance</span><span className="tabular-nums">{formatCurrency(payTarget.amount - payTarget.paidAmount)}</span></div>
            </div>
            <Input label="Amount (৳)" type="number" min={1} step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
            <div>
              <label htmlFor="method" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500">Method</label>
              <select id="method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500">
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="CARD">Card</option>
                <option value="BANK">Bank transfer</option>
              </select>
            </div>
            <Input label="Reference (optional)" placeholder="bKash trx id…" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setPayTarget(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Record payment</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Receipt modal */}
      <Modal open={!!receiptInvoice} onClose={() => setReceiptInvoice(null)} title="Payment receipt">
        {receiptInvoice && (
          <div className="text-sm">
            <div className="rounded-2xl border border-ink-100 p-4">
              <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                <div>
                  <p className="font-display text-lg font-semibold text-brand-950">Aurora School</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-ink-400">Money receipt</p>
                </div>
                <Receipt className="h-6 w-6 text-brand-600" aria-hidden />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                <dt className="text-ink-400">Invoice</dt><dd className="font-mono">{receiptInvoice.invoiceNo}</dd>
                <dt className="text-ink-400">Student</dt><dd>{receiptInvoice.student ? `${receiptInvoice.student.firstName} ${receiptInvoice.student.lastName}` : '—'}</dd>
                <dt className="text-ink-400">Title</dt><dd>{receiptInvoice.title}</dd>
                <dt className="text-ink-400">Amount paid</dt><dd className="font-semibold">{formatCurrency(receiptInvoice.paidAmount)}</dd>
                <dt className="text-ink-400">Balance</dt><dd>{formatCurrency(receiptInvoice.amount - receiptInvoice.paidAmount)}</dd>
              </dl>
            </div>
            {receiptInvoice.payments && receiptInvoice.payments.length > 0 && (
              <table className="mt-3 w-full text-xs">
                <thead><tr className="text-left text-[10px] uppercase text-ink-400"><th className="pb-1">Date</th><th className="pb-1">Method</th><th className="pb-1 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-ink-100">
                  {receiptInvoice.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-1.5">{formatDate(payment.createdAt)}</td>
                      <td className="py-1.5">{payment.method}{payment.reference ? ` · ${payment.reference}` : ''}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="mt-4 flex justify-end gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
              <Button size="sm" onClick={() => setReceiptInvoice(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
