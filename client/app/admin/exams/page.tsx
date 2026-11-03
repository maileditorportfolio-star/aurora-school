'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, Plus, Trash2, CalendarDays, ArrowRight, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import type { Exam, Subject } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn, formatDate } from '@/lib/utils';

const KIND_LABEL: Record<Exam['kind'], string> = {
  CLASS_TEST: 'Class test',
  MID_TERM: 'Mid term',
  FINAL: 'Final',
  OTHER: 'Other',
};

interface DraftSubject {
  subjectId: string;
  maxMarks: string;
  passMarks: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Exam['kind']>('CLASS_TEST');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [drafts, setDrafts] = useState<DraftSubject[]>([
    { subjectId: '', maxMarks: '100', passMarks: '33' },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.exams.list(), api.classes.subjects()])
      .then(([examsRes, subjectsRes]) => {
        setExams(examsRes.exams);
        setSubjects(subjectsRes.subjects);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    Promise.resolve().then(load);
  }, []); // load is stable for the lifetime of this page

  const subjectName = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  const resetForm = () => {
    setName('');
    setKind('CLASS_TEST');
    setStartDate('');
    setEndDate('');
    setDrafts([{ subjectId: '', maxMarks: '100', passMarks: '33' }]);
    setError(null);
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const chosen = drafts.filter((row) => row.subjectId);
    if (chosen.length === 0) {
      setError('Pick at least one subject.');
      setSaving(false);
      return;
    }
    const ids = chosen.map((row) => row.subjectId);
    if (new Set(ids).size !== ids.length) {
      setError('Each subject can appear only once per exam.');
      setSaving(false);
      return;
    }

    try {
      await api.exams.create({
        name: name.trim(),
        kind,
        startDate: startDate || null,
        endDate: endDate || null,
        subjects: chosen.map((row) => ({
          subjectId: row.subjectId,
          maxMarks: Number(row.maxMarks) || 100,
          passMarks: Number(row.passMarks) || 33,
        })),
      });
      setFormOpen(false);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ConsoleHeader
        title="Exams & marks"
        description="Set up examinations, then jump into the gradebook to enter marks or print the class result sheet."
        actions={
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New exam
          </Button>
        }
      />

      <div className="p-5 sm:p-8">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-ink-100" />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No exams yet"
            hint="Create the Half Yearly Examination or a weekly class test to start entering marks."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" />
                New exam
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="group flex flex-col rounded-3xl border border-ink-100 bg-white p-5 shadow-soft transition hover:border-brand-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        exam.kind === 'FINAL'
                          ? 'bg-rose-100 text-rose-700'
                          : exam.kind === 'MID_TERM'
                            ? 'bg-signal-100 text-signal-800'
                            : 'bg-brand-50 text-brand-800',
                      )}
                    >
                      {KIND_LABEL[exam.kind]}
                    </span>
                    <h2 className="mt-2 font-display text-xl font-semibold text-brand-950">
                      {exam.name}
                    </h2>
                    {exam.startDate && (
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-400">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(exam.startDate)}
                        {exam.endDate ? ` – ${formatDate(exam.endDate)}` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    aria-label={`Delete ${exam.name}`}
                    onClick={() => {
                      if (
                        confirm(
                          `Delete “${exam.name}” and all of its marks? This cannot be undone.`,
                        )
                      ) {
                        api.exams.remove(exam.id).then(load);
                      }
                    }}
                    className="grid h-9 w-9 place-items-center rounded-xl text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {exam.subjects.map((row) => (
                    <span
                      key={row.id}
                      className="rounded-full bg-frost px-3 py-1 text-[11px] font-medium text-ink-600"
                    >
                      {row.subject?.name ?? subjectName.get(row.subjectId) ?? 'Subject'} ·{' '}
                      {row.maxMarks}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
                  <p className="text-[11px] text-ink-400">{exam.subjects.length} subjects</p>
                  <Link
                    href={`/admin/exams/${exam.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                  >
                    <GraduationCap className="h-4 w-4" aria-hidden />
                    Open gradebook
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="New examination"
        wide
        description="Pick the subjects and weighting. Marks can be entered per section afterwards."
      >
        <form onSubmit={create} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Exam name"
              placeholder="Half Yearly Examination 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <label
                htmlFor="exam-kind"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
              >
                Kind
              </label>
              <select
                id="exam-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as Exam['kind'])}
                className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              >
                <option value="CLASS_TEST">Class test</option>
                <option value="MID_TERM">Mid term</option>
                <option value="FINAL">Final</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <fieldset className="rounded-2xl border border-ink-100 p-4">
            <legend className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
              Subjects
            </legend>
            <div className="space-y-2">
              {drafts.map((row, index) => (
                <div key={index} className="grid grid-cols-12 items-center gap-2">
                  <select
                    aria-label={`Subject ${index + 1}`}
                    value={row.subjectId}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, subjectId: e.target.value } : r)),
                      )
                    }
                    className="col-span-6 h-11 rounded-xl border border-ink-200 bg-white px-3 text-xs outline-none focus:border-brand-500"
                  >
                    <option value="">Select subject…</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    aria-label="Max marks"
                    title="Max marks"
                    value={row.maxMarks}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, maxMarks: e.target.value } : r)),
                      )
                    }
                    className="col-span-2 h-11 rounded-xl border border-ink-200 bg-white px-2 text-center text-xs outline-none focus:border-brand-500"
                  />
                  <input
                    type="number"
                    min={0}
                    aria-label="Pass marks"
                    title="Pass marks"
                    value={row.passMarks}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, passMarks: e.target.value } : r)),
                      )
                    }
                    className="col-span-2 h-11 rounded-xl border border-ink-200 bg-white px-2 text-center text-xs outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    aria-label="Remove subject row"
                    onClick={() => setDrafts((prev) => prev.filter((_, i) => i !== index))}
                    className="col-span-2 h-11 rounded-xl text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                  >
                    ×
                  </button>
                </div>
              ))}
              <p className="text-[10px] text-ink-400">
                max · pass per subject. Use × to drop a row.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                setDrafts((prev) => [...prev, { subjectId: '', maxMarks: '100', passMarks: '33' }])
              }
            >
              <Plus className="h-4 w-4" />
              Add subject
            </Button>
          </fieldset>

          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create exam
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
