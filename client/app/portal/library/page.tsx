'use client';

import { useEffect, useState } from 'react';
import { Library, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { BookIssue } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { PortalChildSelect, usePortalChild } from '@/components/portal-child';
import { cn, formatDate } from '@/lib/utils';

const STATUS_STYLES: Record<BookIssue['status'], string> = {
  ISSUED: 'bg-brand-50 text-brand-800',
  RETURNED: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  LOST: 'bg-ink-100 text-ink-500',
};

export default function PortalLibraryPage() {
  const { selected, loading: childLoading } = usePortalChild();
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    Promise.resolve().then(() => {
      setLoading(true);
      api.portal
        .library({ studentId: selected.id })
        .then(({ issues }) => setIssues(issues))
        .finally(() => setLoading(false));
    });
  }, [selected]);

  return (
    <>
      <ConsoleHeader
        title="Library"
        description="Books currently on loan, due dates and fines."
        actions={<PortalChildSelect />}
      />

      <div className="space-y-5 p-5 sm:p-8">
        {childLoading || loading ? (
          <div className="h-48 animate-pulse rounded-3xl bg-ink-100" />
        ) : issues.length === 0 ? (
          <EmptyState
            icon={Library}
            title="Nothing on loan"
            hint="When your child borrows a book, it appears here with its due date."
          />
        ) : (
          <Panel title={`Loans (${issues.length})`}>
            <ul className="divide-y divide-ink-100">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink-800">{issue.book.title}</p>
                    <p className="text-[11px] text-ink-400">
                      {issue.book.author ?? 'Unknown author'}
                      {issue.book.shelfLocation ? ` · Shelf ${issue.book.shelfLocation}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-ink-500">
                      due{' '}
                      <span className={cn('font-semibold', issue.isOverdue && 'text-rose-600')}>
                        {formatDate(issue.dueDate)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        STATUS_STYLES[issue.status],
                      )}
                    >
                      {issue.status}
                    </span>
                    {issue.fineAmount > 0 && (
                      <span className="flex items-center gap-1 text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden />৳{issue.fineAmount}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
