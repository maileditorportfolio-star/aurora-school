'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { TimetableSlot } from '@/types';
import { ConsoleHeader } from '@/components/ui/console';
import { TimetableGrid } from '@/components/timetable-grid';
import { PortalChildSelect, usePortalChild } from '@/components/portal-child';

export default function PortalTimetablePage() {
  const { selected, loading: childLoading } = usePortalChild();
  const [slots, setSlots] = useState<TimetableSlot[] | null>(null);
  const [sectionLabel, setSectionLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    Promise.resolve().then(() => {
      setSlots(null);
      api.portal.timetable({ studentId: selected.id }).then(({ slots, section }) => {
        setSlots(slots);
        setSectionLabel(section ? `${section.className ?? ''} ${section.name}`.trim() : null);
      });
    });
  }, [selected]);

  return (
    <>
      <ConsoleHeader
        title="Timetable"
        description={sectionLabel ? `Weekly grid for ${sectionLabel}.` : 'Weekly grid.'}
        actions={<PortalChildSelect />}
      />
      <div className="p-5 sm:p-8">
        {childLoading || slots === null ? (
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        ) : (
          <TimetableGrid slots={slots} />
        )}
      </div>
    </>
  );
}
