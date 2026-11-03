import { cn } from '@/lib/utils';

/** Generic content placeholder used while console data loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className ?? 'h-12 w-full')} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-3 p-5 sm:p-8" aria-hidden>
      <Skeleton className="h-20" />
      <Skeleton className="h-64" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
