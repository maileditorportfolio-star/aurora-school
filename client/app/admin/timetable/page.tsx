'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Save,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SchoolClass, SlotKind, Subject, StaffMember } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAYS = [
  { dayOfWeek: 0, label: 'Sunday' },
  { dayOfWeek: 1, label: 'Monday' },
  { dayOfWeek: 2, label: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thursday' },
];

interface SlotDraft {
  startTime: string;
  endTime: string;
  kind: SlotKind;
  subjectId: string;
  teacherId: string;
  room: string;
}

const emptySlot = (startTime = '08:30', endTime = '09:15'): SlotDraft => ({
  startTime,
  endTime,
  kind: 'CLASS',
  subjectId: '',
  teacherId: '',
  room: '',
});

const defaultGrid = (): Record<number, SlotDraft[]> => {
  const rows: SlotDraft[] = [
    {
      startTime: '08:00',
      endTime: '08:30',
      kind: 'ASSEMBLY',
      subjectId: '',
      teacherId: '',
      room: 'Field',
    },
    emptySlot('08:30', '09:15'),
    emptySlot('09:15', '10:00'),
    emptySlot('10:15', '11:00'),
    emptySlot('11:00', '11:45'),
    emptySlot('12:00', '12:45'),
    emptySlot('12:45', '13:30'),
  ];
  return Object.fromEntries(DAYS.map((d) => [d.dayOfWeek, rows.map((r) => ({ ...r }))]));
};

export default function TimetablePage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [activeDay, setActiveDay] = useState(0);
  const [grid, setGrid] = useState<Record<number, SlotDraft[]>>(defaultGrid);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(
    () =>
      classes.flatMap((schoolClass) =>
        schoolClass.sections.map((s) => ({ id: s.id, label: `${schoolClass.name} ${s.name}` })),
      ),
    [classes],
  );

  useEffect(() => {
    Promise.all([api.classes.tree(), api.classes.subjects(), api.staff.list()])
      .then(([classesRes, subjectsRes, staffRes]) => {
        setClasses(classesRes.classes);
        setSubjects(subjectsRes.subjects);
        setStaff(staffRes.staff);
        const first = classesRes.classes[0]?.sections[0];
        if (first) setSectionId(first.id);
      })
      .catch(() => setError('Could not load the class structure'));
  }, []);

  const loadSection = useCallback((id: string) => {
    if (!id) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    api.timetable
      .bySection(id)
      .then(({ slots }) => {
        if (slots.length === 0) {
          setGrid(defaultGrid());
          return;
        }
        const next: Record<number, SlotDraft[]> = Object.fromEntries(
          DAYS.map((d) => [d.dayOfWeek, []]),
        );
        for (const slot of slots) {
          next[slot.dayOfWeek]?.push({
            startTime: slot.startTime,
            endTime: slot.endTime,
            kind: slot.kind,
            subjectId: slot.subject?.id ?? '',
            teacherId: slot.teacherId ?? '',
            room: slot.room ?? '',
          });
        }
        for (const day of DAYS)
          next[day.dayOfWeek] = next[day.dayOfWeek].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );
        setGrid(next);
      })
      .catch(() => setError('Could not load the timetable'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => loadSection(sectionId));
  }, [sectionId, loadSection]);

  const updateSlot = (index: number, patch: Partial<SlotDraft>) => {
    setGrid((prev) => ({
      ...prev,
      [activeDay]: prev[activeDay].map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    }));
  };

  const addSlot = () => {
    setGrid((prev) => ({ ...prev, [activeDay]: [...prev[activeDay], emptySlot()] }));
  };

  const removeSlot = (index: number) => {
    setGrid((prev) => ({ ...prev, [activeDay]: prev[activeDay].filter((_, i) => i !== index) }));
  };

  const copyToAllDays = () => {
    setGrid((prev) => {
      const source = prev[activeDay].map((slot) => ({ ...slot }));
      const next = { ...prev };
      for (const day of DAYS) next[day.dayOfWeek] = source.map((slot) => ({ ...slot }));
      return next;
    });
    setMessage(`Copied ${DAYS.find((d) => d.dayOfWeek === activeDay)?.label} to all days.`);
  };

  const save = async () => {
    if (!sectionId) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const slots = DAYS.flatMap((day) =>
      grid[day.dayOfWeek].map((slot, index) => ({
        dayOfWeek: day.dayOfWeek,
        periodNo: index + 1,
        startTime: slot.startTime,
        endTime: slot.endTime,
        kind: slot.kind,
        subjectId: slot.kind === 'CLASS' && slot.subjectId ? slot.subjectId : null,
        teacherId: slot.kind === 'CLASS' && slot.teacherId ? slot.teacherId : null,
        room: slot.room.trim() || null,
      })),
    );

    try {
      await api.timetable.replaceSlots({ sectionId, slots });
      setMessage('Timetable saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the timetable');
    } finally {
      setSaving(false);
    }
  };

  if (sections.length === 0 && !error) {
    return (
      <>
        <ConsoleHeader title="Timetable" />
        <div className="p-5 sm:p-8">
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        </div>
      </>
    );
  }

  return (
    <>
      <ConsoleHeader
        title="Timetable"
        description="Build the weekly grid per section. Classes, breaks and assemblies — teachers see their own grid in the teacher console."
        actions={
          <Button size="sm" onClick={save} loading={saving} disabled={!sectionId}>
            <Save className="h-4 w-4" aria-hidden />
            Save grid
          </Button>
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Day">
            {DAYS.map((day) => (
              <button
                key={day.dayOfWeek}
                role="tab"
                aria-selected={activeDay === day.dayOfWeek}
                onClick={() => setActiveDay(day.dayOfWeek)}
                className={cn(
                  'h-10 rounded-xl px-3 text-xs font-semibold transition sm:px-4',
                  activeDay === day.dayOfWeek
                    ? 'bg-brand-700 text-white'
                    : 'bg-white text-ink-500 hover:text-brand-800',
                )}
              >
                {day.label.slice(0, 3)}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={copyToAllDays}
            title="Copy this day to Sunday–Thursday"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Copy to all
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {message}
          </p>
        )}

        {loading ? (
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        ) : (
          <Panel
            title={`${DAYS.find((d) => d.dayOfWeek === activeDay)?.label} — periods`}
            actions={
              <Button size="sm" variant="outline" onClick={addSlot}>
                <Plus className="h-4 w-4" />
                Period
              </Button>
            }
          >
            <ol className="space-y-2">
              {grid[activeDay].length === 0 && (
                <EmptyState
                  icon={CalendarClock}
                  title="Empty day"
                  hint="Add periods or copy another day."
                  action={
                    <Button size="sm" onClick={addSlot}>
                      <Plus className="h-4 w-4" />
                      Add period
                    </Button>
                  }
                />
              )}
              {grid[activeDay].map((slot, index) => (
                <li
                  key={index}
                  className={cn(
                    'grid grid-cols-12 items-center gap-2 rounded-2xl border p-2',
                    slot.kind === 'ASSEMBLY'
                      ? 'border-signal-200 bg-signal-50/50'
                      : slot.kind === 'BREAK'
                        ? 'border-ink-200 bg-ink-50/60'
                        : 'border-ink-100 bg-white',
                  )}
                >
                  <span className="col-span-1 text-center font-display text-lg font-semibold text-ink-400">
                    {index + 1}
                  </span>

                  <select
                    value={slot.kind}
                    aria-label="Slot kind"
                    onChange={(e) => updateSlot(index, { kind: e.target.value as SlotKind })}
                    className="col-span-3 h-10 rounded-xl border border-ink-200 bg-white px-2 text-xs font-semibold outline-none focus:border-brand-500 sm:col-span-2"
                  >
                    <option value="CLASS">Class</option>
                    <option value="BREAK">Break</option>
                    <option value="ASSEMBLY">Assembly</option>
                  </select>

                  <div className="col-span-4 flex items-center gap-1 sm:col-span-2">
                    <input
                      type="time"
                      value={slot.startTime}
                      aria-label="Start time"
                      onChange={(e) => updateSlot(index, { startTime: e.target.value })}
                      className="h-10 w-full min-w-0 rounded-xl border border-ink-200 bg-white px-2 text-xs outline-none focus:border-brand-500"
                    />
                    <span className="text-ink-400">–</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      aria-label="End time"
                      onChange={(e) => updateSlot(index, { endTime: e.target.value })}
                      className="h-10 w-full min-w-0 rounded-xl border border-ink-200 bg-white px-2 text-xs outline-none focus:border-brand-500"
                    />
                  </div>

                  {slot.kind === 'CLASS' ? (
                    <>
                      <select
                        value={slot.subjectId}
                        aria-label="Subject"
                        onChange={(e) => updateSlot(index, { subjectId: e.target.value })}
                        className="col-span-6 h-10 rounded-xl border border-ink-200 bg-white px-2 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                      >
                        <option value="">Subject…</option>
                        {subjects.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.teacherId}
                        aria-label="Teacher"
                        onChange={(e) => updateSlot(index, { teacherId: e.target.value })}
                        className="col-span-5 h-10 rounded-xl border border-ink-200 bg-white px-2 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                      >
                        <option value="">Teacher…</option>
                        {staff.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span className="col-span-11 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400 sm:col-span-4">
                      {slot.kind === 'BREAK' ? 'Break — tiffin / prayer' : 'Morning assembly'}
                    </span>
                  )}

                  <input
                    value={slot.room}
                    aria-label="Room"
                    placeholder="Room…"
                    onChange={(e) => updateSlot(index, { room: e.target.value })}
                    className="col-span-4 h-10 rounded-xl border border-ink-200 bg-white px-2 text-xs outline-none focus:border-brand-500 sm:col-span-2"
                  />

                  <button
                    aria-label="Remove period"
                    onClick={() => removeSlot(index)}
                    className="col-span-1 grid h-10 place-items-center justify-self-end rounded-xl text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
            <p className="mt-3 flex items-center gap-2 text-[10px] text-ink-400">
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
              Save replaces the whole section grid. Class-wide assignments automatically let the
              right teacher enter marks.
            </p>
          </Panel>
        )}
      </div>
    </>
  );
}
