const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { bookSchema, bookIssueSchema, bookReturnSchema, parse } = require('../validation/schemas');

const issueInclude = {
  book: true,
  student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } },
};

const withOverdue = (issue) => ({
  ...issue,
  isOverdue: issue.status === 'ISSUED' && new Date(issue.dueDate) < new Date(),
});

// ---------- Catalogue ----------

/** GET /api/library/books?search=&category= */
const listBooks = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();

  const books = await prisma.book.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { author: { contains: search } },
              { isbn: { contains: search } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { title: 'asc' },
  });

  res.json({ success: true, data: { books } });
});

/** POST /api/library/books */
const createBook = asyncHandler(async (req, res) => {
  const data = parse(bookSchema, req.body);
  if (data.isbn) {
    const existing = await prisma.book.findUnique({ where: { isbn: data.isbn } });
    if (existing) throw ApiError.conflict('A book with that ISBN already exists');
  }

  const book = await prisma.book.create({
    data: { ...data, isbn: data.isbn || null, availableCopies: data.totalCopies },
  });
  res.status(201).json({ success: true, data: { book } });
});

/** PATCH /api/library/books/:id */
const updateBook = asyncHandler(async (req, res) => {
  const data = parse(bookSchema.partial(), req.body);
  const existing = await prisma.book.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Book not found');

  const onLoan = existing.totalCopies - existing.availableCopies;
  const totalCopies = data.totalCopies ?? existing.totalCopies;
  if (totalCopies < onLoan) {
    throw ApiError.badRequest(
      `${onLoan} copies are currently on loan — total cannot drop below that`,
    );
  }

  const book = await prisma.book.update({
    where: { id: existing.id },
    data: {
      ...data,
      isbn: data.isbn === '' ? null : data.isbn,
      availableCopies: totalCopies - onLoan,
    },
  });
  res.json({ success: true, data: { book } });
});

/** DELETE /api/library/books/:id */
const removeBook = asyncHandler(async (req, res) => {
  const existing = await prisma.book.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { issues: { where: { status: 'ISSUED' } } } } },
  });
  if (!existing) throw ApiError.notFound('Book not found');
  if (existing._count.issues > 0) throw ApiError.conflict('This book has copies on loan');

  await prisma.book.delete({ where: { id: existing.id } });
  res.json({ success: true, data: { id: existing.id } });
});

// ---------- Lending ----------

/** GET /api/library/issues?status=&studentId=&overdue= */
const listIssues = asyncHandler(async (req, res) => {
  const { status, studentId } = req.query;
  const overdue = req.query.overdue === 'true';

  const issues = await prisma.bookIssue.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(studentId ? { studentId: String(studentId) } : {}),
      ...(overdue ? { status: 'ISSUED', dueDate: { lt: new Date() } } : {}),
    },
    include: issueInclude,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: 200,
  });

  res.json({ success: true, data: { issues: issues.map(withOverdue) } });
});

/** POST /api/library/issues — issue a book to a student. */
const issueBook = asyncHandler(async (req, res) => {
  const { bookId, studentId, dueDate } = parse(bookIssueSchema, req.body);

  const [book, student] = await Promise.all([
    prisma.book.findUnique({ where: { id: bookId } }),
    prisma.student.findUnique({ where: { id: studentId } }),
  ]);
  if (!book) throw ApiError.notFound('Book not found');
  if (!student) throw ApiError.notFound('Student not found');
  if (book.availableCopies < 1) throw ApiError.conflict('No copies available for this book');

  const issue = await prisma.$transaction(async (tx) => {
    await tx.book.update({
      where: { id: book.id },
      data: { availableCopies: { decrement: 1 } },
    });
    return tx.bookIssue.create({
      data: { bookId: book.id, studentId: student.id, dueDate: new Date(dueDate) },
      include: issueInclude,
    });
  });

  res.status(201).json({ success: true, data: { issue: withOverdue(issue) } });
});

/** POST /api/library/issues/:id/return — return a book, optionally with a fine. */
const returnBook = asyncHandler(async (req, res) => {
  const { fineAmount } = parse(bookReturnSchema, req.body || {});

  const issue = await prisma.bookIssue.findUnique({ where: { id: req.params.id } });
  if (!issue) throw ApiError.notFound('Issue record not found');
  if (issue.status === 'RETURNED') throw ApiError.badRequest('This book has already been returned');

  const closed = await prisma.$transaction(async (tx) => {
    await tx.book.update({
      where: { id: issue.bookId },
      data: { availableCopies: { increment: 1 } },
    });
    return tx.bookIssue.update({
      where: { id: issue.id },
      data: { status: 'RETURNED', returnDate: new Date(), fineAmount },
      include: issueInclude,
    });
  });

  res.json({ success: true, data: { issue: withOverdue(closed) } });
});

/** POST /api/library/issues/:id/lost — mark a lost book. */
const markLost = asyncHandler(async (req, res) => {
  const issue = await prisma.bookIssue.findUnique({ where: { id: req.params.id } });
  if (!issue) throw ApiError.notFound('Issue record not found');
  if (issue.status !== 'ISSUED') throw ApiError.badRequest('Only issued books can be marked lost');

  const lost = await prisma.bookIssue.update({
    where: { id: issue.id },
    data: { status: 'LOST' },
    include: issueInclude,
  });

  res.json({ success: true, data: { issue: lost } });
});

module.exports = {
  listBooks,
  createBook,
  updateBook,
  removeBook,
  listIssues,
  issueBook,
  returnBook,
  markLost,
};
