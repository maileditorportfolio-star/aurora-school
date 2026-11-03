'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Save,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Table2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Exam, GradebookResponse } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { gradeBadgeClass } from '@/lib/gradebook';
import { cn } from '@/lib/utils';

type Tab = 'entry' | 'gradebook';

export default function ExamGradebookPage() {
  const params = useParams<{ examId: string }>();
  const examId = params.examId;
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [sections, setSections] = useState<Array<{ id: string; label: string }>>([]);
  const [sectionId, setSectionId] = useState('');
  const [tab, setTab] = useState<Tab>('entry');
  const [activeSubjectId, setActiveSubjectId] = useState('');
  const [gradebook, setGradebook] = useState<GradebookResponse | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load exam + sections
  useEffect(() => {
    Promise.all([api.exams.detail(examId), api.classes.tree()])
      .then(([examRes, classesRes]) => {
        setExam(examRes.exam);
        const options = classesRes.classes.flatMap((schoolClass) =>
          schoolClass.sections.map((section) => ({
            id: section.id,
            label: `${schoolClass.name} ${section.name}`,
          })),
        );
        setSections(options);
        if (!sectionId && options[0]) setSectionId(options[0].id);
        if (examRes.exam.subjects[0]) setActiveSubjectId(examRes.exam.subjects[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load exam'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const loadGradebook = useCallback(() => {
    if (!sectionId) return;
    setLoading(true);
    api.exams
      .gradebook(examId, sectionId)
      .then((data) => {
        setGradebook(data);
        const subject = data.subjects.find((row) => row.id === activeSubjectId) ?? data.subjects[0];
        if (subject) {
          setActiveSubjectId(subject.id);
          setInputs(
            Object.fromEntries(
              data.students.map((student) => [
                student.id,
                student.marks[subject.id]?.marksObtained != null
                  ? String(student.marks[subject.id]?.marksObtained)
                  : '',
              ]),
            ),
          );
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load gradebook'))
      .finally(() => setLoading(false));
  }, [examId, sectionId, activeSubjectId]);

  useEffect(() => {
    Promise.resolve().then(loadGradebook);
    // Reload only when section or exam changes; subject switching maps inputs locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId, examId]);

  // Switch subject: rebuild inputs from the loaded gradebook without refetching.
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

  const activeSubject = gradebook?.subjects.find((row) => row.id === activeSubjectId);

  const dirty = useMemo(() => {
    if (!gradebook || !activeSubject) return false;
    return gradebook.students.some((student) => {
      const current = gradebook.students.length ? (inputs[student.id] ?? '') : '';
      const original = student.marks[activeSubject.id]?.marksObtained;
      const normalized = current === '' ? null : Number(current);
      return (original ?? null) !== normalized;
    });
  }, [gradebook, inputs, activeSubject]);

  const saveMarks = async () => {
    if (!activeSubject || !sectionId || !gradebook) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    for (const [studentId, raw] of Object.entries(inputs)) {
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
      setMessage(`Saved ${saved} marks for ${activeSubject.subject.name}.`);
      loadGradebook();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save marks');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !gradebook) {
    return (
      <>
        <ConsoleHeader title="Gradebook" />
        <div className="p-5 sm:p-8">
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        </div>
      </>
    );
  }

  return (
    <>
      <ConsoleHeader
        title={exam?.name ?? 'Gradebook'}
        description={
          exam
            ? `${exam.subjects.length} subjects · pick a section, then enter marks or open the result sheet.`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/exams')}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Exams
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden />
              Print
            </Button>
          </div>
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        {/* Controls (screen only) */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
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

          <div
            className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1"
            role="tablist"
            aria-label="Gradebook views"
          >
            <button
              role="tab"
              aria-selected={tab === 'entry'}
              onClick={() => setTab('entry')}
              className={cn(
                'flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition',
                tab === 'entry' ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-brand-800',
              )}
            >
              <ClipboardList className="h-4 w-4" aria-hidden />
              Enter marks
            </button>
            <button
              role="tab"
              aria-selected={tab === 'gradebook'}
              onClick={() => setTab('gradebook')}
              className={cn(
                'flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold transition',
                tab === 'gradebook'
                  ? 'bg-brand-700 text-white'
                  : 'text-ink-500 hover:text-brand-800',
              )}
            >
              <Table2 className="h-4 w-4" aria-hidden />
              Result sheet
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700 print:hidden"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800 print:hidden"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {message}
          </p>
        )}

        {!gradebook || loading ? (
          <div className="h-72 animate-pulse rounded-3xl bg-ink-100" />
        ) : gradebook.students.length === 0 ? (
          <EmptyState
            title="No students in this section"
            hint="Admit students to this section before entering marks."
          />
        ) : (
          <>
            {/* Print header (print only) */}
            <div className="hidden print:block">
              <h1 className="text-xl font-bold">
                {exam?.name} — {gradebook.section.className} {gradebook.section.name}
              </h1>
              <p className="text-sm text-ink-500">Aurora School · Result sheet</p>
            </div>

            {tab === 'entry' ? (
              <Panel
                title="Marks entry"
                actions={
                  <select
                    value={activeSubjectId}
                    onChange={(event) => switchSubject(event.target.value)}
                    aria-label="Subject"
                    className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold outline-none focus:border-brand-500"
                  >
                    {gradebook.subjects.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.subject.name} (max {row.maxMarks})
                      </option>
                    ))}
                  </select>
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                        <th className="pb-2 pe-2">Roll</th>
                        <th className="pb-2 pe-2">Student</th>
                        <th className="pb-2 pe-2">Marks obtained</th>
                        <th className="pb-2">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {gradebook.students.map((student) => {
                        const existing = activeSubject ? student.marks[activeSubject.id] : null;
                        return (
                          <tr key={student.id}>
                            <td className="py-1.5 pe-2 font-mono text-xs text-ink-500">
                              {student.rollNumber ?? '—'}
                            </td>
                            <td className="py-1.5 pe-2">
                              <span className="font-semibold text-ink-800">
                                {student.firstName} {student.lastName}
                              </span>
                            </td>
                            <td className="py-1.5 pe-2">
                              <input
                                type="number"
                                min={0}
                                max={activeSubject?.maxMarks ?? 100}
                                inputMode="decimal"
                                aria-label={`Marks for ${student.firstName} ${student.lastName}`}
                                value={inputs[student.id] ?? ''}
                                onChange={(event) =>
                                  setInputs((prev) => ({
                                    ...prev,
                                    [student.id]: event.target.value,
                                  }))
                                }
                                placeholder="—"
                                className="h-9 w-24 rounded-xl border border-ink-200 bg-white px-2 text-center text-sm outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="py-1.5 text-[10px] uppercase tracking-wider">
                              {existing?.grade ? (
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 font-bold',
                                    gradeBadgeClass(existing.grade),
                                  )}
                                >
                                  {existing.grade}
                                </span>
                              ) : (
                                <span className="text-ink-300">unmarked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-4 print:hidden">
                  <p className="text-[11px] text-ink-400">
                    Blank = absent / not appeared. Marks above {activeSubject?.maxMarks ?? 100} are
                    rejected.
                  </p>
                  <Button onClick={saveMarks} loading={saving}>
                    <Save className="h-4 w-4" aria-hidden />
                    Save marks
                  </Button>
                </div>
              </Panel>
            ) : (
              <Panel title="Result sheet" className="print:border-0 print:shadow-none">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-xs">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink-400">
                        <th className="border-b-2 border-ink-200 pb-2 pe-2">Roll</th>
                        <th className="border-b-2 border-ink-200 pb-2 pe-2">Student</th>
                        {gradebook.subjects.map((row) => (
                          <th
                            key={row.id}
                            className="border-b-2 border-ink-200 pb-2 pe-2 text-center"
                          >
                            {row.subject.code}
                          </th>
                        ))}
                        <th className="border-b-2 border-ink-200 pb-2 pe-2 text-center">GPA</th>
                        <th className="border-b-2 border-ink-200 pb-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradebook.students.map((student) => (
                        <tr key={student.id} className="border-b border-ink-100 align-middle">
                          <td className="py-1.5 pe-2 font-mono">{student.rollNumber ?? '—'}</td>
                          <td className="py-1.5 pe-2 font-semibold text-ink-800">
                            {student.firstName} {student.lastName}
                          </td>
                          {gradebook.subjects.map((row) => {
                            const mark = student.marks[row.id];
                            return (
                              <td key={row.id} className="py-1.5 pe-2 text-center tabular-nums">
                                {mark?.marksObtained != null ? (
                                  <span
                                    className={cn(
                                      mark.marksObtained < row.passMarks &&
                                        'font-bold text-rose-600',
                                    )}
                                  >
                                    {mark.marksObtained}
                                  </span>
                                ) : (
                                  <span className="text-ink-300">—</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="py-1.5 pe-2 text-center font-semibold tabular-nums">
                            {student.summary.gpa?.toFixed(2) ?? '—'}
                          </td>
                          <td className="py-1.5 text-center">
                            {student.summary.grade ? (
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                  gradeBadgeClass(student.summary.grade),
                                )}
                              >
                                {student.summary.grade}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[10px] text-ink-400 print:hidden">
                  F (below pass) in any subject caps the GPA at 0. Red marks are below pass marks.
                </p>
              </Panel>
            )}
          </>
        )}
      </div>
    </>
  );
}
