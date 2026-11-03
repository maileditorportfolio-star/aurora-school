import { describe, it, expect } from 'vitest';
import { gradeBadgeClass } from '@/lib/gradebook';

describe('gradeBadgeClass', () => {
  it('returns distinct classes for each grade band', () => {
    expect(gradeBadgeClass('A+')).toContain('emerald');
    expect(gradeBadgeClass('A')).toContain('emerald');
    expect(gradeBadgeClass('F')).toContain('rose');
    expect(gradeBadgeClass('B')).toContain('signal');
  });
});
