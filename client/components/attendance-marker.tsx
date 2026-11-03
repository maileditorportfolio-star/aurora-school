'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Check, X, Clock, Save, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { AttendanceStatus } from '@/types';
import { Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';

export interface AttendanceSectionOption {
  id: string;
  label: string;
}

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; className: string; icon: typeof Check }
> = {
  PRESENT: {
    label: 'Present',
    className: 'bg-emerald-600 text-white border-emerald-600',
    icon: Check,
  },
  ABSENT: { label: 'Absent', className: 'bg-rose-600 text-white border-rose-600', icon: X },
  LATE: { label: 'Late', className: 'bg-signal-500 text-ink-950 border-signal-500', icon: Clock },
  EXCUSED: { label: 'Excused', className: 'bg-ink-600 text-white border-ink-600', icon: Check },
};

interface RosterRow {
  id: string;
  rollNumber?: number | null;
  firstName: string;
  lastName: string;
  admissionNo: string;
  status: AttendanceStatus | null;
}

/**
 * Shared attendance register. Admins pass every section; teachers pass the
 * sections they are assigned to. Saves via the /attendance/mark endpoint.
 */
export function AttendanceMarker({ sections }: { sections: AttendanceSectionOption[] }) {
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!sectionId && sections.length > 0) setSectionId(sections[0].id);
    });
  }, [sections, sectionId]);

  useEffect(() => {
    if (!sectionId) return;
    Promise.resolve().then(() => {
      setLoading(true);
      setMessage(null);
      api.attendance
        .bySection(sectionId, date)
        .then(({ students }) => {
          setRows(students);
          setMarks(Object.fromEntries(students.map((row) => [row.id, row.status ?? 'PRESENT'])));
        })
        .finally(() => setLoading(false));
    });
  }, [sectionId, date]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.firstName} ${row.lastName} ${row.admissionNo}`.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    Object.values(marks).forEach((status) => {
      tally[status] += 1;
    });
    return tally;
  }, [marks]);

  const save = async () => {
    if (!sectionId) return;
    setSaving(true);
    setMessage(null);
    try {
      const { marked } = await api.attendance.mark({
        sectionId,
        date,
        entries: rows.map((row) => ({ studentId: row.id, status: marks[row.id] ?? 'PRESENT' })),
      });
      setMessage(`Saved ${marked} records for ${formatDate(date)}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: AttendanceStatus) => {
    setMarks((prev) => Object.fromEntries(Object.keys(prev).map((id) => [id, status])));
  };

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck2}
        title="No sections assigned"
        hint="Ask the office to assign you to a section first."
      />
    );
  }

  return (
    <Panel
      title="Daily register"
      actions={
        <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-500">
          <span>{counts.PRESENT} present</span>·<span>{counts.LATE} late</span>·
          <span className={counts.ABSENT ? 'text-rose-600' : ''}>{counts.ABSENT} absent</span>
        </div>
      }
    >
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
          aria-label="Section"
          className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Attendance date"
          className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500"
        />
        <div className="relative min-w-40 flex-1">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter students…"
            aria-label="Filter students"
            className="h-11 w-full rounded-2xl border border-ink-200 bg-white ps-10 pe-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={() => markAll('PRESENT')}>
          All present
        </Button>
        <Button size="sm" variant="ghost" onClick={() => markAll('ABSENT')}>
          All absent
        </Button>
      </div>

      {/* Roster */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
              <th className="pb-2 pe-2">Roll</th>
              <th className="pb-2 pe-2">Student</th>
              <th className="pb-2">Register</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {loading &&
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={3} className="py-2">
                    <div className="h-9 animate-pulse rounded-xl bg-ink-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              visible.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pe-2 font-mono text-xs text-ink-500">
                    {row.rollNumber ?? '—'}
                  </td>
                  <td className="py-2 pe-2">
                    <p className="font-semibold text-ink-800">
                      {row.firstName} {row.lastName}
                    </p>
                    <p className="font-mono text-[10px] text-ink-400">{row.admissionNo}</p>
                  </td>
                  <td className="py-2">
                    <div
                      className="flex flex-wrap gap-1.5"
                      role="radiogroup"
                      aria-label={`Attendance for ${row.firstName}`}
                    >
                      {(Object.keys(STATUS_META) as AttendanceStatus[]).map((status) => {
                        const active = marks[row.id] === status;
                        const meta = STATUS_META[status];
                        return (
                          <button
                            key={status}
                            role="radio"
                            aria-checked={active}
                            onClick={() => setMarks((prev) => ({ ...prev, [row.id]: status }))}
                            className={cn(
                              'h-8 rounded-xl border border-ink-200 px-3 text-[11px] font-semibold text-ink-500 transition',
                              active && meta.className,
                            )}
                          >
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-xs text-ink-400">
                  No students match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p
          className={cn(
            'text-xs',
            message?.startsWith('Saved') ? 'text-emerald-700' : 'text-ink-500',
          )}
          role="status"
        >
          {message ?? 'Changes are applied to the selected date only.'}
        </p>
        <Button onClick={save} loading={saving} disabled={rows.length === 0}>
          <Save className="h-4 w-4" aria-hidden />
          Save register
        </Button>
      </div>
    </Panel>
  );
}
