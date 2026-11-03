'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  CalendarCheck2,
  Wallet,
  ClipboardList,
  Megaphone,
  ArrowRight,
  BookOpenCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { PortalOverview } from '@/types';
import { ConsoleHeader, Panel, StatCard, EmptyState } from '@/components/ui/console';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { gradeBadgeClass } from '@/lib/gradebook';
import { PortalChildSelect } from '@/components/portal-child';

export default function PortalHomePage() {
  const [overview, setOverview] = useState<PortalOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.portal
      .overview()
      .then(setOverview)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Could not load your dashboard'),
      );
  }, []);

  const students = overview?.students ?? [];
  const totalDue = students.reduce((sum, child) => sum + child.fees.due, 0);
  const avgAttendance =
    students.filter((child) => child.attendanceRate !== null).length > 0
      ? Math.round(
          students.reduce((sum, child) => sum + (child.attendanceRate ?? 0), 0) /
            students.filter((child) => child.attendanceRate !== null).length,
        )
      : null;

  return (
    <>
      <ConsoleHeader
        title="Family portal"
        description="Attendance, results, fees and school life — everything about your child, in one place."
        actions={<PortalChildSelect />}
      />

      <div className="space-y-6 p-5 sm:p-8">
        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {!overview ? (
          <div className="h-64 animate-pulse rounded-3xl bg-ink-100" />
        ) : students.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No student linked yet"
            hint="Ask the school office to link your account to your child using your guardian email."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Children enrolled"
                value={students.length}
                icon={GraduationCap}
                tone="brand"
              />
              <StatCard
                label="Attendance (30 days)"
                value={avgAttendance !== null ? `${avgAttendance}%` : '—'}
                icon={CalendarCheck2}
                tone="gold"
                hint="Present + late count as attended"
              />
              <StatCard
                label="Fees due"
                value={formatCurrency(totalDue)}
                icon={Wallet}
                tone={totalDue > 0 ? 'danger' : 'ink'}
                hint={totalDue > 0 ? 'Visit the office or pay by bKash' : 'All clear'}
              />
            </div>

            {students.map((child) => (
              <Panel
                key={child.id}
                title={`${child.firstName} ${child.lastName} — ${child.className ?? 'Unassigned'} ${child.sectionName ?? ''}`}
                actions={
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-800">
                    {child.admissionNo}
                  </span>
                }
              >
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Attendance + fees */}
                  <div className="lg:col-span-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                      Attendance
                    </p>
                    <div className="mt-2 flex items-end gap-3">
                      <span className="font-display text-5xl font-semibold text-brand-900">
                        {child.attendanceRate ?? '—'}
                      </span>
                      <span className="pb-2 text-xs text-ink-400">
                        %<br />
                        last 30 days
                      </span>
                    </div>
                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          (child.attendanceRate ?? 0) >= 75 ? 'bg-emerald-500' : 'bg-rose-500',
                        )}
                        style={{ width: `${Math.min(100, child.attendanceRate ?? 0)}%` }}
                      />
                    </div>

                    <div className="mt-5 border-t border-ink-100 pt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                          Fees
                        </p>
                        <Link
                          href="/portal/fees"
                          className="text-[11px] font-semibold text-brand-700 hover:text-brand-600"
                        >
                          Details →
                        </Link>
                      </div>
                      <p
                        className={cn(
                          'mt-2 font-display text-2xl font-semibold',
                          child.fees.due > 0 ? 'text-rose-600' : 'text-emerald-700',
                        )}
                      >
                        {formatCurrency(child.fees.due)}
                      </p>
                      <p className="text-[11px] text-ink-400">{child.fees.open} open invoice(s)</p>
                    </div>
                  </div>

                  {/* Upcoming exams */}
                  <div className="lg:col-span-4">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                      <ClipboardList className="h-4 w-4" aria-hidden />
                      Upcoming exams
                    </p>
                    <ul className="mt-2 space-y-2">
                      {child.upcomingExams.length === 0 && (
                        <li className="text-xs text-ink-400">Nothing scheduled.</li>
                      )}
                      {child.upcomingExams.map((exam) => (
                        <li key={exam.id} className="rounded-2xl border border-ink-100 px-3 py-2">
                          <p className="text-xs font-semibold text-ink-800">{exam.name}</p>
                          <p className="text-[10px] uppercase tracking-wider text-ink-400">
                            {exam.startDate ? formatDate(exam.startDate) : 'Date to be announced'}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recent results */}
                  <div className="lg:col-span-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                        <BookOpenCheck className="h-4 w-4" aria-hidden />
                        Latest marks
                      </p>
                      <Link
                        href="/portal/results"
                        className="text-[11px] font-semibold text-brand-700 hover:text-brand-600"
                      >
                        All results →
                      </Link>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {child.recentResults.length === 0 && (
                        <li className="text-xs text-ink-400">No marks entered yet.</li>
                      )}
                      {child.recentResults.map((result, index) => (
                        <li
                          key={`${result.exam}-${result.subject}-${index}`}
                          className="flex items-center justify-between gap-2 rounded-2xl bg-frost px-3 py-2 text-xs"
                        >
                          <span className="min-w-0 truncate text-ink-700">{result.subject}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="tabular-nums font-semibold text-ink-800">
                              {result.marksObtained ?? '—'}/{result.maxMarks}
                            </span>
                            {result.grade && (
                              <span
                                className={cn(
                                  'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                                  gradeBadgeClass(result.grade),
                                )}
                              >
                                {result.grade}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Panel>
            ))}
          </>
        )}

        {/* Quick links */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
          <Megaphone className="h-4 w-4" aria-hidden />
          Questions about your child? Call the office or message us —
          <Link href="/notices" className="font-semibold text-brand-700 hover:text-brand-600">
            see school notices
          </Link>
          <ArrowRight className="h-3 w-3" aria-hidden />
        </div>
      </div>
    </>
  );
}
