import type { FeeInvoice, FeeStructure } from '@/types';

export const STATUS_STYLES: Record<FeeInvoice['status'], string> = {
  PENDING: 'bg-signal-100 text-signal-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  WAIVED: 'bg-ink-100 text-ink-500',
};

export const FREQ_LABEL: Record<FeeStructure['frequency'], string> = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual',
  ONE_TIME: 'One-time',
};

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
