'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TimetableSlot } from '@/types';
import { ConsoleHeader } from '@/components/ui/console';
import { TimetableGrid } from '@/components/timetable-grid';

export default function TeacherTimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[] | null>(null);

  useEffect(() => {
    api.teacher
      .timetable()
      .then(({ slots }) => setSlots(slots))
      .catch(() => setSlots([]));
  }, []);

  return (
    <>
      <ConsoleHeader
        title="My timetable"
        description="Your teaching grid for Sunday–Thursday, exactly as published by the office."
      />
      <div className="p-5 sm:p-8">
        {slots === null ? (
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        ) : (
          <TimetableGrid slots={slots} />
        )}
      </div>
    </>
  );
}
