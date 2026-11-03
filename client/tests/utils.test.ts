import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatNumber, formatDate, initials } from '@/lib/utils';

describe('utils', () => {
  it('cn joins truthy class names', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('formatCurrency renders BDT amounts', () => {
    expect(formatCurrency(1500)).toMatch(/1,500/);
  });

  it('formatNumber adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formatDate renders a readable date', () => {
    expect(formatDate('2026-08-15')).toMatch(/15/);
    expect(formatDate('2026-08-15')).toMatch(/Aug|2026/);
  });

  it('initials extracts up to two initials', () => {
    expect(initials('Naim Khan')).toBe('NK');
    expect(initials('Ayesha')).toBe('A');
    expect(initials('')).toBe('');
  });
});
