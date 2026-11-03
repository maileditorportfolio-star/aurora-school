// @ts-nocheck
import { cn } from '@/lib/utils';
import type { SchoolClass, Section, StaffMember, Subject, SubjectAssignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel, EmptyState } from '@/components/ui/console';
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

export interface ClassTabsProps {
  ctx: any;
}

export function ClassTabs({ ctx }: ClassTabsProps) {
  const {
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
  } = ctx;

  return (
    <>
      {/* Tabs */}
      <div
        className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1 shadow-soft sm:inline-flex"
        role="tablist"
        aria-label="Sections"
      >
        {(
          [
            { id: 'classes', label: 'Classes & sections' },
            { id: 'subjects', label: 'Subjects' },
            { id: 'assignments', label: 'Teacher assignments' },
          ] as Array<{ id: Tab; label: string }>
        ).map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-semibold transition',
              tab === item.id ? 'bg-brand-700 text-white' : 'text-ink-500 hover:text-brand-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700"
        >
          {error}
        </p>
      )}

      {tab === 'classes' && (
        <div className="grid gap-6 xl:grid-cols-12">
          {/* Add class */}
          <Panel className="xl:col-span-4 self-start" title="Add a class">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newClass.trim()) return;
                act(() =>
                  api.classes
                    .create({ name: newClass.trim(), order: classes.length + 1 })
                    .then(() => setNewClass('')),
                );
              }}
            >
              <Input
                aria-label="Class name"
                placeholder="e.g. Grade 11"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
              />
              <Button type="submit" size="md" aria-label="Add class">
                <Plus className="h-4 w-4" />
              </Button>
            </form>
            <p className="mt-3 text-[11px] leading-5 text-ink-400">
              Classes are ordered numerically. Deleting a class requires emptying its sections
              first.
            </p>
          </Panel>

          {/* Class tree */}
          <div className="space-y-3 xl:col-span-8">
            {classes.length === 0 && (
              <EmptyState
                icon={School}
                title="No classes yet"
                hint="Create Grade 1 to get started."
              />
            )}
            {classes.map((schoolClass) => {
              const isOpen = expanded[schoolClass.id] ?? true;
              return (
                <div
                  key={schoolClass.id}
                  className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setExpanded((prev) => ({ ...prev, [schoolClass.id]: !isOpen }))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpanded((prev) => ({ ...prev, [schoolClass.id]: !isOpen }));
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-ink-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-ink-400" />
                    )}
                    <span className="font-display text-lg font-semibold text-brand-950">
                      {schoolClass.name}
                    </span>
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      {schoolClass.sections.length} sections
                    </span>
                    <button
                      aria-label={`Delete ${schoolClass.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (confirm(`Delete ${schoolClass.name}? Its sections must be empty.`)) {
                          act(() => api.classes.remove(schoolClass.id));
                        }
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-ink-100 px-5 py-4">
                      {/* Sections */}
                      <div className="flex flex-wrap items-center gap-2">
                        {schoolClass.sections.map((section) => (
                          <span
                            key={section.id}
                            className="group inline-flex items-center gap-2 rounded-2xl border border-ink-100 bg-frost py-1.5 pe-1.5 ps-3 text-xs font-semibold text-ink-700"
                          >
                            Section {section.name}
                            <span className="rounded-full bg-white px-1.5 text-[10px] text-ink-400">
                              {section.studentCount ?? 0} students
                            </span>
                            <button
                              aria-label={`Delete section ${section.name}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete section ${section.name}? Students must be moved or archived first.`,
                                  )
                                ) {
                                  act(() => api.classes.removeSection(section.id));
                                }
                              }}
                              className="grid h-6 w-6 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                        <form
                          className="inline-flex items-center gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            const name = (newSection[schoolClass.id] || '').trim().toUpperCase();
                            if (!name) return;
                            act(() =>
                              api.classes
                                .addSection({ classId: schoolClass.id, name })
                                .then(() =>
                                  setNewSection((prev) => ({ ...prev, [schoolClass.id]: '' })),
                                ),
                            );
                          }}
                        >
                          <input
                            value={newSection[schoolClass.id] ?? ''}
                            onChange={(e) =>
                              setNewSection((prev) => ({
                                ...prev,
                                [schoolClass.id]: e.target.value.toUpperCase(),
                              }))
                            }
                            placeholder="A"
                            aria-label="New section letter"
                            maxLength={4}
                            className="h-9 w-16 rounded-xl border border-dashed border-ink-200 bg-transparent px-2 text-center text-xs font-bold uppercase outline-none focus:border-brand-500"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            aria-label="Add section"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      </div>

                      {/* Subjects for this class */}
                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
                          Subjects taught
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {classSubjects(schoolClass).map((subject) => (
                            <span
                              key={subject.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pe-1.5 ps-3 text-[11px] font-medium text-brand-900"
                            >
                              {subject.name}
                              <button
                                aria-label={`Remove ${subject.name} from ${schoolClass.name}`}
                                onClick={() =>
                                  act(() =>
                                    api.classes.removeClassSubject(schoolClass.id, subject.id),
                                  )
                                }
                                className="grid h-5 w-5 place-items-center rounded-full text-brand-400 transition hover:bg-brand-100 hover:text-brand-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <select
                            aria-label={`Add subject to ${schoolClass.name}`}
                            value=""
                            onChange={(event) => {
                              const subjectId = event.target.value;
                              if (subjectId)
                                act(() => api.classes.addClassSubject(schoolClass.id, subjectId));
                            }}
                            className="h-7 rounded-full border border-dashed border-ink-200 bg-transparent px-2 text-[11px] text-ink-500 outline-none focus:border-brand-500"
                          >
                            <option value="">+ Add subject…</option>
                            {subjects
                              .filter(
                                (subject) =>
                                  !classSubjects(schoolClass).some((row) => row.id === subject.id),
                              )
                              .map((subject) => (
                                <option key={subject.id} value={subject.id}>
                                  {subject.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid gap-6 xl:grid-cols-12">
          <Panel className="xl:col-span-4 self-start" title="Add a subject">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newSubject.name.trim() || !newSubject.code.trim()) return;
                act(() =>
                  api.classes
                    .createSubject({
                      name: newSubject.name.trim(),
                      code: newSubject.code.trim().toUpperCase(),
                    })
                    .then(() => setNewSubject({ name: '', code: '' })),
                );
              }}
            >
              <Input
                label="Subject name"
                placeholder="e.g. Physics"
                value={newSubject.name}
                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                required
              />
              <Input
                label="Code"
                placeholder="PHY101"
                value={newSubject.code}
                onChange={(e) =>
                  setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })
                }
                required
              />
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                Add subject
              </Button>
            </form>
          </Panel>

          <Panel className="xl:col-span-8" title="Subject catalogue">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    <th className="pb-3 pe-3">Name</th>
                    <th className="pb-3 pe-3">Code</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {subjects.map((subject) => (
                    <tr key={subject.id}>
                      <td className="py-2.5 pe-3 font-medium text-ink-800">{subject.name}</td>
                      <td className="py-2.5 pe-3 font-mono text-xs text-ink-500">{subject.code}</td>
                      <td className="py-2.5 text-right">
                        <button
                          aria-label={`Delete ${subject.name}`}
                          onClick={() => {
                            if (
                              confirm(
                                `Delete ${subject.name}? Exams using it will keep their marks.`,
                              )
                            ) {
                              act(() => api.classes.removeSubject(subject.id));
                            }
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'assignments' && (
        <div className="grid gap-6 xl:grid-cols-12">
          <Panel className="xl:col-span-4 self-start" title="Assign a teacher">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!assignForm.classId || !assignForm.subjectId || !assignForm.teacherId) return;
                act(() =>
                  api.classes
                    .createAssignment({
                      classId: assignForm.classId,
                      sectionId: assignForm.sectionId || null,
                      subjectId: assignForm.subjectId,
                      teacherId: assignForm.teacherId,
                    })
                    .then(() =>
                      setAssignForm({ classId: '', sectionId: '', subjectId: '', teacherId: '' }),
                    ),
                );
              }}
            >
              <div>
                <label
                  htmlFor="assign-class"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                >
                  Class
                </label>
                <select
                  id="assign-class"
                  value={assignForm.classId}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, classId: e.target.value, sectionId: '' })
                  }
                  className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select class…</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={schoolClass.id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="assign-section"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                >
                  Section (optional)
                </label>
                <select
                  id="assign-section"
                  value={assignForm.sectionId}
                  onChange={(e) => setAssignForm({ ...assignForm, sectionId: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">Class-wide (all sections)</option>
                  {flatSections
                    .filter((s) => s.classId === assignForm.classId)
                    .map((section) => (
                      <option key={section.id} value={section.id}>
                        Section {section.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="assign-subject"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                >
                  Subject
                </label>
                <select
                  id="assign-subject"
                  value={assignForm.subjectId}
                  onChange={(e) => setAssignForm({ ...assignForm, subjectId: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select subject…</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="assign-teacher"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
                >
                  Teacher
                </label>
                <select
                  id="assign-teacher"
                  value={assignForm.teacherId}
                  onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
                  required
                >
                  <option value="">Select teacher…</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                Save assignment
              </Button>
            </form>
          </Panel>

          <Panel className="xl:col-span-8" title="Current assignments">
            {assignments.length === 0 ? (
              <EmptyState
                icon={UserRound}
                title="No assignments yet"
                hint="Assignments decide who can mark attendance and enter marks."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="pb-3 pe-3">Class</th>
                      <th className="pb-3 pe-3">Subject</th>
                      <th className="pb-3 pe-3">Teacher</th>
                      <th className="pb-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="py-2.5 pe-3 text-ink-800">
                          {assignment.schoolClass?.name}
                          {assignment.section ? ` ${assignment.section.name}` : ' (all sections)'}
                        </td>
                        <td className="py-2.5 pe-3 text-ink-600">{assignment.subject?.name}</td>
                        <td className="py-2.5 pe-3 text-ink-800">{assignment.teacher?.name}</td>
                        <td className="py-2.5 text-right">
                          <button
                            aria-label="Remove assignment"
                            onClick={() => act(() => api.classes.removeAssignment(assignment.id))}
                            className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      <p className="flex items-center gap-2 text-[11px] text-ink-400">
        <Users className="h-3.5 w-3.5" aria-hidden /> Assignments feed the teacher portal: only
        assigned teachers can mark attendance or enter marks for a section.
        <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
        <Building2 className="h-3.5 w-3.5" aria-hidden />
      </p>
    </>
  );
}
