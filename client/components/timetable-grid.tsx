'use client';

import type { TimetableSlot } from '@/types';
import { cn } from '@/lib/utils';

const DAYS = [
  { dayOfWeek: 0, label: 'Sunday' },
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
  { dayOfWeek: 5, label: 'Friday' },
  { dayOfWeek: 6, label: 'Saturday' },
];

/** Read-only weekly timetable, grouped by day. */
export function TimetableGrid({ slots }: { slots: TimetableSlot[] }) {
  const byDay = new Map<number, TimetableSlot[]>();
  for (const slot of slots) {
    const list = byDay.get(slot.dayOfWeek) ?? [];
    list.push(slot);
    byDay.set(slot.dayOfWeek, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.periodNo - b.periodNo);

  const activeDays = DAYS.filter((day) => byDay.has(day.dayOfWeek));

  if (activeDays.length === 0) {
    return <p className="text-sm text-ink-400">No timetable published for this section yet.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {activeDays.map((day) => (
        <section
          key={day.dayOfWeek}
          className="rounded-3xl border border-ink-100 bg-white p-4 shadow-soft"
        >
          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-700">
            {day.label}
          </h3>
          <ol className="mt-2 divide-y divide-ink-100">
            {byDay.get(day.dayOfWeek)!.map((slot) => (
              <li
                key={`${day.dayOfWeek}-${slot.periodNo}`}
                className="flex items-center gap-3 py-2"
              >
                <span className="w-10 shrink-0 font-mono text-[10px] font-semibold text-ink-400">
                  {slot.startTime}
                </span>
                <div
                  className={cn(
                    'min-w-0 flex-1 rounded-2xl px-3 py-1.5',
                    slot.kind === 'ASSEMBLY'
                      ? 'bg-signal-50'
                      : slot.kind === 'BREAK'
                        ? 'bg-ink-50'
                        : 'bg-brand-50/60',
                  )}
                >
                  {slot.kind === 'CLASS' ? (
                    <>
                      <p className="truncate text-xs font-semibold text-ink-800">
                        {slot.subject?.name ?? 'Class'}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-ink-400">
                        {slot.room ? slot.room : 'Room TBA'}
                        {slot.teacherName ? ` · ${slot.teacherName}` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
                      {slot.kind}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
