/** Badge colours for letter grades. */
export const gradeBadgeClass = (grade: string): string => {
  if (grade === 'A+') return 'bg-emerald-100 text-emerald-800';
  if (grade === 'A') return 'bg-emerald-50 text-emerald-700';
  if (grade === 'A-') return 'bg-brand-50 text-brand-800';
  if (grade === 'B') return 'bg-signal-100 text-signal-800';
  if (grade === 'C') return 'bg-orange-100 text-orange-800';
  if (grade === 'D') return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-700';
};
