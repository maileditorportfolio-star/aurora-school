import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Standard header for console pages: title, optional description and actions. */
export function ConsoleHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-100 bg-white px-5 py-5 sm:px-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-brand-950">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** KPI tile used across dashboards. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'brand',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'brand' | 'gold' | 'ink' | 'danger';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    gold: 'bg-signal-50 text-signal-700',
    ink: 'bg-ink-100 text-ink-600',
    danger: 'bg-rose-50 text-rose-600',
  } as const;

  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
          {label}
        </p>
        {Icon && (
          <span className={cn('grid h-9 w-9 place-items-center rounded-xl', tones[tone])}>
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-brand-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

/** Empty state block. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-ink-200 bg-white/60 px-6 py-14 text-center">
      {Icon && (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {hint && <p className="max-w-sm text-xs leading-5 text-ink-400">{hint}</p>}
      {action}
    </div>
  );
}

/** Section card wrapper for console pages. */
export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-3xl border border-ink-100 bg-white shadow-soft', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          {title && <h2 className="text-sm font-semibold text-brand-950">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
