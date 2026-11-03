'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Library,
  Search,
  Plus,
  BookUp,
  Undo2,
  XCircle,
  Trash2,
  AlertCircle,
  BookOpenCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Book, BookIssue, Student } from '@/types';
import { ConsoleHeader, Panel, EmptyState } from '@/components/ui/console';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { cn, formatDate, initials } from '@/lib/utils';

type Tab = 'books' | 'issues';

const emptyBook = {
  title: '',
  author: '',
  isbn: '',
  category: '',
  publisher: '',
  totalCopies: '1',
  shelfLocation: '',
};

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<BookIssue[]>([]);
  const [search, setSearch] = useState('');
  const [issueFilter, setIssueFilter] = useState<'ISSUED' | 'OVERDUE' | 'RETURNED'>('ISSUED');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookFormOpen, setBookFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState(emptyBook);
  const [saving, setSaving] = useState(false);

  const [issueOpen, setIssueOpen] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentHits, setStudentHits] = useState<Student[]>([]);
  const [chosenStudent, setChosenStudent] = useState<Student | null>(null);
  const [chosenBookId, setChosenBookId] = useState('');
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  );

  const loadBooks = useCallback(() => {
    setLoading(true);
    api.library
      .books(search ? { search } : {})
      .then(({ books }) => setBooks(books))
      .finally(() => setLoading(false));
  }, [search]);

  const loadIssues = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (issueFilter === 'OVERDUE') params.overdue = 'true';
    else params.status = issueFilter;
    api.library
      .issues(params)
      .then(({ issues }) => setIssues(issues))
      .finally(() => setLoading(false));
  }, [issueFilter]);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (tab === 'books') loadBooks();
      else loadIssues();
    });
  }, [tab, loadBooks, loadIssues]);

  // Keep the catalogue warm so the issue dialog always has fresh availability.
  useEffect(() => {
    api.library
      .books()
      .then(({ books }) => setBooks(books))
      .catch(() => {});
  }, []);

  // Debounced student search for the issue dialog.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (studentQuery.trim().length < 2 || chosenStudent) {
      Promise.resolve().then(() => setStudentHits([]));
      return;
    }
    searchTimer.current = setTimeout(() => {
      api.students
        .list({ search: studentQuery.trim(), limit: 6, status: 'ACTIVE' })
        .then(({ students }) => setStudentHits(students));
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [studentQuery, chosenStudent]);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      if (tab === 'books') loadBooks();
      else loadIssues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed');
    }
  };

  const saveBook = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: bookForm.title.trim(),
      author: bookForm.author.trim() || null,
      isbn: bookForm.isbn.trim() || null,
      category: bookForm.category.trim() || null,
      publisher: bookForm.publisher.trim() || null,
      totalCopies: Number(bookForm.totalCopies) || 1,
      shelfLocation: bookForm.shelfLocation.trim() || null,
    };
    try {
      if (payload.totalCopies < 1) throw new Error('Total copies must be at least 1');
      if (editingBook) await api.library.updateBook(editingBook.id, payload);
      else await api.library.createBook(payload);
      setBookFormOpen(false);
      loadBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the book');
    } finally {
      setSaving(false);
    }
  };

  const openIssue = () => {
    setIssueOpen(true);
    setChosenStudent(null);
    setStudentQuery('');
    setStudentHits([]);
    setChosenBookId('');
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  };

  const submitIssue = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chosenStudent || !chosenBookId) return;
    setSaving(true);
    setError(null);
    try {
      await api.library.issue({ bookId: chosenBookId, studentId: chosenStudent.id, dueDate });
      setIssueOpen(false);
      loadIssues();
      loadBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Issue failed');
    } finally {
      setSaving(false);
    }
  };

  const availableBooks = useMemo(() => books.filter((book) => book.availableCopies > 0), [books]);

  return (
    <>
      <ConsoleHeader
        title="Library"
        description="Catalogue, lending and returns. Fines are recorded at return time; overdue loans surface automatically."
        actions={
          tab === 'books' ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingBook(null);
                setBookForm(emptyBook);
                setBookFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add book
            </Button>
          ) : (
            <Button size="sm" onClick={openIssue}>
              <BookUp className="h-4 w-4" />
              Issue book
            </Button>
          )
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1"
            role="tablist"
            aria-label="Library views"
          >
            {(
              [
                { id: 'books', label: `Catalogue (${books.length})` },
                { id: 'issues', label: `Loans (${issues.length})` },
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

          {tab === 'books' ? (
            <div className="relative min-w-56 flex-1 sm:max-w-md">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, author or ISBN…"
                aria-label="Search books"
                className="h-11 w-full rounded-2xl border border-ink-200 bg-white ps-10 pe-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
          ) : (
            <div
              className="flex gap-1 rounded-2xl border border-ink-100 bg-white p-1"
              role="tablist"
              aria-label="Loan status"
            >
              {(
                [
                  { id: 'ISSUED', label: 'On loan' },
                  { id: 'OVERDUE', label: 'Overdue' },
                  { id: 'RETURNED', label: 'Returned' },
                ] as Array<{ id: typeof issueFilter; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={issueFilter === item.id}
                  onClick={() => setIssueFilter(item.id)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-xs font-semibold transition',
                    issueFilter === item.id
                      ? 'bg-ink-800 text-white'
                      : 'text-ink-500 hover:text-ink-800',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
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

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-100" />
            ))}
          </div>
        ) : tab === 'books' ? (
          books.length === 0 ? (
            <EmptyState
              icon={Library}
              title="No books in the catalogue"
              hint="Add your first titles — start with curriculum sets and reference works."
            />
          ) : (
            <Panel>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="pb-3 pe-3">Title</th>
                      <th className="pb-3 pe-3">Author</th>
                      <th className="pb-3 pe-3">Category</th>
                      <th className="pb-3 pe-3 text-center">Copies</th>
                      <th className="pb-3 pe-3">Shelf</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {books.map((book) => (
                      <tr key={book.id}>
                        <td className="py-2.5 pe-3 font-semibold text-ink-800">{book.title}</td>
                        <td className="py-2.5 pe-3 text-ink-600">{book.author ?? '—'}</td>
                        <td className="py-2.5 pe-3 text-ink-500">{book.category ?? '—'}</td>
                        <td className="py-2.5 pe-3 text-center tabular-nums">
                          <span
                            className={cn(book.availableCopies === 0 && 'font-bold text-rose-600')}
                          >
                            {book.availableCopies}
                          </span>
                          <span className="text-ink-400"> / {book.totalCopies}</span>
                        </td>
                        <td className="py-2.5 pe-3 font-mono text-xs text-ink-500">
                          {book.shelfLocation ?? '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              aria-label={`Edit ${book.title}`}
                              onClick={() => {
                                setEditingBook(book);
                                setBookForm({
                                  title: book.title,
                                  author: book.author ?? '',
                                  isbn: book.isbn ?? '',
                                  category: book.category ?? '',
                                  publisher: book.publisher ?? '',
                                  totalCopies: String(book.totalCopies),
                                  shelfLocation: book.shelfLocation ?? '',
                                });
                                setBookFormOpen(true);
                              }}
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-brand-50 hover:text-brand-700"
                            >
                              <BookOpenCheck className="h-4 w-4" />
                            </button>
                            <button
                              aria-label={`Delete ${book.title}`}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete “${book.title}”? Copies on loan must be returned first.`,
                                  )
                                ) {
                                  act(() => api.library.removeBook(book.id));
                                }
                              }}
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )
        ) : issues.length === 0 ? (
          <EmptyState
            icon={BookUp}
            title={issueFilter === 'RETURNED' ? 'No returns yet' : 'Nothing on loan'}
            hint="Issue a book and it will appear here with its due date."
          />
        ) : (
          <Panel>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    <th className="pb-3 pe-3">Book</th>
                    <th className="pb-3 pe-3">Student</th>
                    <th className="pb-3 pe-3">Issued</th>
                    <th className="pb-3 pe-3">Due</th>
                    <th className="pb-3 pe-3">Fine</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {issues.map((issue) => (
                    <tr key={issue.id} className={cn(issue.isOverdue && 'bg-rose-50/40')}>
                      <td className="py-2.5 pe-3 font-medium text-ink-800">{issue.book.title}</td>
                      <td className="py-2.5 pe-3 text-ink-700">
                        {issue.student
                          ? `${issue.student.firstName} ${issue.student.lastName}`
                          : '—'}
                        <span className="block font-mono text-[10px] text-ink-400">
                          {issue.student?.admissionNo}
                        </span>
                      </td>
                      <td className="py-2.5 pe-3 text-ink-500">{formatDate(issue.issueDate)}</td>
                      <td className="py-2.5 pe-3">
                        <span className={cn(issue.isOverdue && 'font-bold text-rose-600')}>
                          {formatDate(issue.dueDate)}
                        </span>
                      </td>
                      <td className="py-2.5 pe-3 tabular-nums">
                        {issue.fineAmount > 0 ? `৳${issue.fineAmount}` : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        {issue.status === 'ISSUED' && (
                          <div className="flex justify-end gap-1">
                            <button
                              aria-label="Return book"
                              title="Return (prompts for fine)"
                              onClick={() => {
                                const fine = prompt(
                                  'Fine amount in ৳ (0 if none):',
                                  issue.isOverdue ? '50' : '0',
                                );
                                if (fine === null) return;
                                act(() =>
                                  api.library.return(issue.id, { fineAmount: Number(fine) || 0 }),
                                );
                              }}
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                            <button
                              aria-label="Mark lost"
                              title="Mark lost"
                              onClick={() => {
                                if (
                                  confirm(
                                    'Mark this book as lost? The copy will not return to stock.',
                                  )
                                ) {
                                  act(() => api.library.lost(issue.id));
                                }
                              }}
                              className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* Book modal */}
      <Modal
        open={bookFormOpen}
        onClose={() => setBookFormOpen(false)}
        title={editingBook ? 'Edit book' : 'Add a book'}
      >
        <form onSubmit={saveBook} className="grid gap-4">
          <Input
            label="Title"
            value={bookForm.title}
            onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Author"
              value={bookForm.author}
              onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
            />
            <Input
              label="ISBN"
              value={bookForm.isbn}
              onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              value={bookForm.category}
              onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
            />
            <Input
              label="Publisher"
              value={bookForm.publisher}
              onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total copies"
              type="number"
              min={1}
              value={bookForm.totalCopies}
              onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })}
              required
            />
            <Input
              label="Shelf location"
              placeholder="A-01"
              value={bookForm.shelfLocation}
              onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setBookFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save book
            </Button>
          </div>
        </form>
      </Modal>

      {/* Issue modal */}
      <Modal
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue a book"
        description="Find the student by name or admission number."
      >
        <form onSubmit={submitIssue} className="grid gap-4">
          <div className="relative">
            <Input
              label="Student"
              placeholder="Type at least 2 characters…"
              value={
                chosenStudent
                  ? `${chosenStudent.firstName} ${chosenStudent.lastName} (${chosenStudent.admissionNo})`
                  : studentQuery
              }
              onChange={(event) => {
                setChosenStudent(null);
                setStudentQuery(event.target.value);
              }}
            />
            {studentHits.length > 0 && !chosenStudent && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
                {studentHits.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChosenStudent(student);
                        setStudentHits([]);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition hover:bg-brand-50"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
                        {initials(`${student.firstName} ${student.lastName}`)}
                      </span>
                      <span>
                        {student.firstName} {student.lastName}
                        <span className="block font-mono text-[9px] text-ink-400">
                          {student.admissionNo}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="book"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-500"
            >
              Book (available copies only)
            </label>
            <select
              id="book"
              value={chosenBookId}
              onChange={(e) => setChosenBookId(e.target.value)}
              className="h-12 w-full rounded-2xl border border-ink-200 bg-white px-4 text-sm outline-none focus:border-brand-500"
              required
            >
              <option value="">Select a book…</option>
              {availableBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} — {book.availableCopies} left
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setIssueOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!chosenStudent || !chosenBookId}>
              Issue book
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
