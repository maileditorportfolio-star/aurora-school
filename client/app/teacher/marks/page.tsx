'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Save, AlertCircle, CheckCircle2, Table2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Exam, GradebookResponse, Section, SubjectAssignment } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { gradeBadgeClass } from '@/lib/gradebook';

type Tab = 'entry' | 'gradebook';

export default function TeacherMarksPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [tab, setTab] = useState<Tab>('entry');
  const [gradebook, setGradebook] = useState<GradebookResponse | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load exams, my sections and my assignments once.
  useEffect(() => {
    Promise.all([api.exams.list(), api.teacher.sections(), api.teacher.overview()]).then(
      ([examsRes, sectionsRes, overview]) => {
        setExams(examsRes.exams);
        setSections(sectionsRes.sections);
        setAssignments(overview.assignments);
        if (examsRes.exams[0]) setExamId(examsRes.exams[0].id);
        if (sectionsRes.sections[0]) setSectionId(sectionsRes.sections[0].id);
      },
    );
  }, []);

  const section = sections.find((row) => row.id === sectionId);

  // Subjects of this exam the teacher may enter, given the chosen section.
  const allowedSubjectIds = useMemo(() => {
    if (!section) return new Set<string>();
    const classId = section.classId ?? section.schoolClass?.id;
    return new Set(
      assignments
        .filter(
          (row) =>
            row.classId === classId && (row.sectionId === section.id || row.sectionId == null),
        )
        .map((row) => row.subjectId),
    );
  }, [assignments, section]);

  const loadGradebook = useCallback(() => {
    if (!examId || !sectionId) return;
    setLoading(true);
    setMessage(null);
    api.exams
      .gradebook(examId, sectionId)
      .then((data) => {
        setGradebook(data);
        const firstAllowed = data.subjects.find((row) => allowedSubjectIds.has(row.subject.id));
        const target = firstAllowed ?? data.subjects[0];
        if (target) {
          setActiveSubjectId((prev) =>
            data.subjects.some((row) => row.id === prev) ? prev : target.id,
          );
          setInputs(
            Object.fromEntries(
              data.students.map((student) => [
                student.id,
                student.marks[target.id]?.marksObtained != null
                  ? String(student.marks[target.id]?.marksObtained)
                  : '',
              ]),
            ),
          );
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load gradebook'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, sectionId]);

  useEffect(() => {
    Promise.resolve().then(loadGradebook);
  }, [loadGradebook]);

  const switchSubject = (subjectId: string) => {
    setActiveSubjectId(subjectId);
    if (!gradebook) return;
    setInputs(
      Object.fromEntries(
        gradebook.students.map((student) => [
          student.id,
          student.marks[subjectId]?.marksObtained != null
            ? String(student.marks[subjectId]?.marksObtained)
            : '',
        ]),
      ),
    );
  };

  const enterableSubjects = useMemo(
    () => (gradebook?.subjects ?? []).filter((row) => allowedSubjectIds.has(row.subject.id)),
    [gradebook, allowedSubjectIds],
  );
  const visibleGradebook = gradebook;

  const activeSubject = gradebook?.subjects.find((row) => row.id === activeSubjectId);
  const canSave = activeSubject ? allowedSubjectIds.has(activeSubject.subject.id) : false;

  const save = async () => {
    if (!activeSubject || !gradebook) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    for (const raw of Object.values(inputs)) {
      if (raw === '') continue;
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0 || value > activeSubject.maxMarks) {
        setError(`Marks must be between 0 and ${activeSubject.maxMarks}.`);
        setSaving(false);
        return;
      }
    }

    try {
      const { saved } = await api.exams.enterMarks({
        examSubjectId: activeSubject.id,
        sectionId,
        entries: gradebook.students.map((student) => ({
          studentId: student.id,
          marksObtained: inputs[student.id] === '' ? null : Number(inputs[student.id]),
        })),
      });
      setMessage(`Saved ${saved} marks.`);
      loadGradebook();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save marks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ConsoleHeader
        title="Enter marks"
        description="You can only enter marks for subjects assigned to you in the selected section."
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={examId}
            onChange={(event) => setExamId(event.target.value)}
            aria-label="Exam"
            className="h-11 max-w-64 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500"
          >
            {exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
          <select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            aria-label="Section"
            className="h-11 rounded-2xl border border-ink-200 bg-white px-3 text-sm outline-none focus:border-brand-500"
          >
            {sections.map((row) => (
              <option key={row.id} value={row.id}>
                {row.schoolClass?.name} {row.name}
              </option>
            ))}
          </select>

          <div
            className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1"
            role="tablist"
            aria-label="Views"
          >
            {(
              [
                { id: 'entry', label: 'Entry', icon: ClipboardList },
                { id: 'gradebook', label: 'Result', icon: Table2 },
              ] as Array<{ id: Tab; label: string; icon: typeof ClipboardList }>
            ).map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition',
                    active ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-brand-800',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.label}
                </button>
              );
            })}
          </div>
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

        {loading && !gradebook ? (
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        ) : !visibleGradebook || visibleGradebook.students.length === 0 ? (
          <EmptyState
            title="Nothing to enter"
            hint="Pick an exam and a section you are assigned to."
          />
        ) : tab === 'entry' ? (
          enterableSubjects.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No assigned subjects here"
              hint="You are not the assigned teacher for any subject in this section — ask the office for an assignment."
            />
          ) : (
            <Panel
              title="Marks entry"
              actions={
                <select
                  value={activeSubjectId}
                  onChange={(event) => switchSubject(event.target.value)}
                  aria-label="Subject"
                  className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-500"
                >
                  {enterableSubjects.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.subject.name} (max {row.maxMarks})
                    </option>
                  ))}
                </select>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="pb-2 pe-2">Roll</th>
                      <th className="pb-2 pe-2">Student</th>
                      <th className="pb-2 pe-2">Marks</th>
                      <th className="pb-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {visibleGradebook.students.map((student) => {
                      const existing = activeSubject ? student.marks[activeSubject.id] : null;
                      return (
                        <tr key={student.id}>
                          <td className="py-1.5 pe-2 font-mono text-xs text-ink-500">
                            {student.rollNumber ?? '—'}
                          </td>
                          <td className="py-1.5 pe-2 font-semibold text-ink-800">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="py-1.5 pe-2">
                            <input
                              type="number"
                              min={0}
                              max={activeSubject?.maxMarks ?? 100}
                              inputMode="decimal"
                              aria-label={`Marks for ${student.firstName}`}
                              value={inputs[student.id] ?? ''}
                              onChange={(event) =>
                                setInputs((prev) => ({ ...prev, [student.id]: event.target.value }))
                              }
                              placeholder="—"
                              className="h-9 w-24 rounded-xl border border-ink-200 bg-white px-2 text-center outline-none focus:border-brand-500"
                            />
                          </td>
                          <td className="py-1.5">
                            {existing?.grade ? (
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                  gradeBadgeClass(existing.grade),
                                )}
                              >
                                {existing.grade}
                              </span>
                            ) : (
                              <span className="text-ink-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
                <p className="text-[11px] text-ink-400">Blank = absent</p>
                <Button onClick={save} loading={saving} disabled={!canSave}>
                  <Save className="h-4 w-4" aria-hidden />
                  Save marks
                </Button>
              </div>
            </Panel>
          )
        ) : (
          <Panel title="Result matrix">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink-400">
                    <th className="border-b-2 border-ink-200 pb-2 pe-2">Roll</th>
                    <th className="border-b-2 border-ink-200 pb-2 pe-2">Student</th>
                    {visibleGradebook.subjects.map((row) => (
                      <th key={row.id} className="border-b-2 border-ink-200 pb-2 pe-2 text-center">
                        {row.subject.code}
                      </th>
                    ))}
                    <th className="border-b-2 border-ink-200 pb-2 text-center">GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleGradebook.students.map((student) => (
                    <tr key={student.id} className="border-b border-ink-100">
                      <td className="py-1.5 pe-2 font-mono">{student.rollNumber ?? '—'}</td>
                      <td className="py-1.5 pe-2 font-semibold text-ink-800">
                        {student.firstName} {student.lastName}
                      </td>
                      {visibleGradebook.subjects.map((row) => {
                        const mark = student.marks[row.id];
                        return (
                          <td key={row.id} className="py-1.5 pe-2 text-center tabular-nums">
                            {mark?.marksObtained != null ? (
                              mark.marksObtained
                            ) : (
                              <span className="text-ink-300">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1.5 text-center font-semibold">
                        {student.summary.gpa?.toFixed(2) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
