'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Section } from '@/types';
import { ConsoleHeader } from '@/components/ui/console';
import { AttendanceMarker, type AttendanceSectionOption } from '@/components/attendance-marker';

export default function TeacherAttendancePage() {
  const [sections, setSections] = useState<AttendanceSectionOption[]>([]);

  useEffect(() => {
    api.teacher.sections().then(({ sections }: { sections: Section[] }) => {
      setSections(
        sections.map((section) => ({
          id: section.id,
          label: `${section.schoolClass?.name ?? 'Class'} ${section.name}`,
        })),
      );
    });
  }, []);

  return (
    <>
      <ConsoleHeader
        title="Mark attendance"
        description="Only the sections where you hold an assignment. Saves are recorded under your name."
      />
      <div className="p-5 sm:p-8">
        <AttendanceMarker sections={sections} />
      </div>
    </>
  );
}
