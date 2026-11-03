// @ts-nocheck
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate, initials } from '@/lib/utils';
import type { Book, BookIssue, Student } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
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

export interface LibraryModalsProps {
  ctx: any;
}

export function LibraryModals({ ctx }: LibraryModalsProps) {
  const {
    bookFormOpen,
    setBookFormOpen,
    editingBook,
    bookForm,
    setBookForm,
    saveBook,
    saving,
    issueOpen,
    setIssueOpen,
    studentQuery,
    setStudentQuery,
    studentHits,
    setStudentHits,
    chosenStudent,
    setChosenStudent,
    chosenBookId,
    setChosenBookId,
    dueDate,
    setDueDate,
    submitIssue,
    availableBooks,
  } = ctx;

  return (
    <>
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
