'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import type { ResultCard } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { PortalChildSelect, usePortalChild } from '@/components/portal-child';
import { cn, formatDate } from '@/lib/utils';
import { gradeBadgeClass } from '@/lib/gradebook';

export default function PortalResultsPage() {
  const { selected, loading: childLoading } = usePortalChild();
  const [results, setResults] = useState<ResultCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    Promise.resolve().then(() => {
      setLoading(true);
      api.portal
        .results({ studentId: selected.id })
        .then(({ results }) => setResults(results))
        .finally(() => setLoading(false));
    });
  }, [selected]);

  return (
    <>
      <ConsoleHeader
        title="Results & report cards"
        description="Marks, grades and GPA for every examined subject. Print for the file."
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <PortalChildSelect />
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-5 sm:p-8">
        {childLoading || loading ? (
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        ) : results.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No results published yet"
            hint="Once the office enters marks for an exam, the result card appears here."
          />
        ) : (
          results.map((card) => (
            <Panel
              key={card.exam.id}
              title={card.exam.name}
              actions={
                <div className="flex items-center gap-3">
                  {card.exam.startDate && (
                    <span className="text-[10px] uppercase tracking-wider text-ink-400">
                      {formatDate(card.exam.startDate)}
                    </span>
                  )}
                  <span className="rounded-full bg-brand-800 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-signal-300">
                    GPA {card.summary.gpa?.toFixed(2) ?? '—'}
                  </span>
                </div>
              }
              className="print:border-0 print:shadow-none"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="border-b-2 border-ink-200 pb-2 pe-2">Subject</th>
                      <th className="border-b-2 border-ink-200 pb-2 pe-2 text-center">Max</th>
                      <th className="border-b-2 border-ink-200 pb-2 pe-2 text-center">Pass</th>
                      <th className="border-b-2 border-ink-200 pb-2 pe-2 text-center">Obtained</th>
                      <th className="border-b-2 border-ink-200 pb-2 text-center">Grade</th>
                      <th className="border-b-2 border-ink-200 pb-2 text-center">GPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.rows.map((row) => (
                      <tr key={row.subject} className="border-b border-ink-100">
                        <td className="py-2 pe-2 font-semibold text-ink-800">{row.subject}</td>
                        <td className="py-2 pe-2 text-center tabular-nums text-ink-500">
                          {row.maxMarks}
                        </td>
                        <td className="py-2 pe-2 text-center tabular-nums text-ink-500">
                          {row.passMarks}
                        </td>
                        <td
                          className={cn(
                            'py-2 pe-2 text-center tabular-nums font-semibold',
                            row.marksObtained != null && row.marksObtained < row.passMarks
                              ? 'text-rose-600'
                              : 'text-ink-800',
                          )}
                        >
                          {row.marksObtained ?? '—'}
                        </td>
                        <td className="py-2 pe-2 text-center">
                          {row.grade ? (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                gradeBadgeClass(row.grade),
                              )}
                            >
                              {row.grade}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 text-center tabular-nums text-ink-600">
                          {row.gpa?.toFixed(1) ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={4}
                        className="pt-3 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400"
                      >
                        Overall
                      </td>
                      <td className="pt-3 text-center">
                        {card.summary.grade && (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold',
                              gradeBadgeClass(card.summary.grade),
                            )}
                          >
                            {card.summary.grade}
                          </span>
                        )}
                      </td>
                      <td className="pt-3 text-center font-display text-base font-semibold text-brand-950">
                        {card.summary.gpa?.toFixed(2) ?? '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Panel>
          ))
        )}
      </div>
    </>
  );
}
