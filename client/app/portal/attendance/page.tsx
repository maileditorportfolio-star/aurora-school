'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { AttendanceRow, AttendanceStatus } from '@/types';
import { ConsoleHeader, Panel, StatCard, EmptyState } from '@/components/ui/console';
import { PortalChildSelect, usePortalChild } from '@/components/portal-child';
import { cn, formatDate } from '@/lib/utils';

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  LATE: 'bg-signal-100 text-signal-800',
  ABSENT: 'bg-rose-50 text-rose-600',
  EXCUSED: 'bg-ink-100 text-ink-500',
};

export default function PortalAttendancePage() {
  const { selected, loading: childLoading } = usePortalChild();
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selected) return;
    Promise.resolve().then(() => {
      setLoading(true);
      api.portal
        .attendance({ studentId: selected.id })
        .then(({ records, rate }) => {
          setRecords(records);
          setRate(rate);
        })
        .finally(() => setLoading(false));
    });
  }, [selected]);

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    records.forEach((row) => {
      tally[row.status] += 1;
    });
    return tally;
  }, [records]);

  return (
    <>
      <ConsoleHeader
        title="Attendance"
        description="Every marked day, exactly as recorded by the class teacher."
        actions={<PortalChildSelect />}
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Present" value={counts.PRESENT} icon={CalendarCheck2} tone="brand" />
          <StatCard label="Late" value={counts.LATE} tone="gold" />
          <StatCard label="Absent" value={counts.ABSENT} tone={counts.ABSENT ? 'danger' : 'ink'} />
          <StatCard
            label="Rate (all marked days)"
            value={rate !== null ? `${rate}%` : '—'}
            tone="gold"
            hint="Present + late count as attended"
          />
        </div>

        {childLoading || loading ? (
          <div className="h-64 animate-pulse rounded-3xl bg-ink-100" />
        ) : records.length === 0 ? (
          <EmptyState
            icon={CalendarCheck2}
            title="No attendance recorded yet"
            hint="Records appear once teachers start marking the register."
          />
        ) : (
          <Panel title={`All records (${records.length})`}>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-frost px-3 py-2"
                >
                  <span className="text-xs font-medium text-ink-700">{formatDate(row.date)}</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      STATUS_STYLES[row.status],
                    )}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
