'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { SchoolClass } from '@/types';
import { ConsoleHeader } from '@/components/ui/console';
import { AttendanceMarker, type AttendanceSectionOption } from '@/components/attendance-marker';

export default function AdminAttendancePage() {
  const [sections, setSections] = useState<AttendanceSectionOption[]>([]);

  useEffect(() => {
    api.classes.tree().then(({ classes }) => {
      setSections(
        classes.flatMap((schoolClass: SchoolClass) =>
          schoolClass.sections.map((section) => ({
            id: section.id,
            label: `${schoolClass.name} ${section.name}`,
          })),
        ),
      );
    });
  }, []);

  return (
    <>
      <ConsoleHeader
        title="Attendance"
        description="Pick a section and date, mark the register, save. Parents see it instantly on the family portal."
      />
      <div className="p-5 sm:p-8">
        <AttendanceMarker sections={sections} />
      </div>
    </>
  );
}
