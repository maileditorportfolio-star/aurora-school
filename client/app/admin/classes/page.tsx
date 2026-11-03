'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  School,
  Plus,
  Trash2,
  Users,
  BookOpenCheck,
  UserRound,
  ChevronDown,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SchoolClass, Section, StaffMember, Subject, SubjectAssignment } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ClassTabs } from '@/components/classes/class-tabs';

type Tab = 'classes' | 'subjects' | 'assignments';

export default function ClassesPage() {
  const [tab, setTab] = useState<Tab>('classes');
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newClass, setNewClass] = useState('');
  const [newSection, setNewSection] = useState<Record<string, string>>({});
  const [newSubject, setNewSubject] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
  });

  const load = useCallback(() => {
    Promise.allSettled([
      api.classes.tree().then(({ classes }) => setClasses(classes)),
      api.classes.subjects().then(({ subjects }) => setSubjects(subjects)),
      api.staff.list().then(({ staff }) => setStaff(staff)),
      api.classes.assignments().then(({ assignments }) => setAssignments(assignments)),
    ]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed');
    }
  };

  const flatSections: Section[] = classes.flatMap((schoolClass) =>
    schoolClass.sections.map((section) => ({
      ...section,
      classId: schoolClass.id,
      schoolClass: { id: schoolClass.id, name: schoolClass.name },
    })),
  );

  const classSubjects = (schoolClass: SchoolClass) => schoolClass.subjects;

  const ctx = {
    tab,
    setTab,
    classes,
    subjects,
    staff,
    assignments,
    expanded,
    setExpanded,
    newClass,
    setNewClass,
    newSection,
    setNewSection,
    newSubject,
    setNewSubject,
    error,
    setError,
    assignForm,
    setAssignForm,
    act,
    load,
    flatSections,
    classSubjects,
  };

  return (
    <>
      <ConsoleHeader
        title="Classes & subjects"
        description="Grade structure, sections, the subject catalogue, and which teacher covers what."
      />

      <div className="space-y-5 p-5 sm:p-8">
        {' '}
        <ClassTabs ctx={ctx} />
      </div>
    </>
  );
}
