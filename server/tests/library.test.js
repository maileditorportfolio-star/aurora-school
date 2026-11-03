import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, restrictedAdmin, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const book = {
  id: 'book-1',
  title: 'Sapiens',
  author: 'Yuval Noah Harari',
  isbn: '9780062316110',
  category: 'History',
  publisher: 'Harper',
  totalCopies: 4,
  availableCopies: 2,
  shelfLocation: 'A-03',
};

describe('library catalogue', () => {
  beforeEach(() => reset());

  it('lists books with search for staff', async () => {
    const token = signIn(superAdmin);
    prisma.book.findMany.mockResolvedValue([book]);

    const res = await request(app)
      .get('/api/library/books?search=sapiens')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(prisma.book.findMany.mock.calls[0][0].where.OR).toBeDefined();
  });

  it('creates a book and sets availableCopies from totalCopies', async () => {
    const token = signIn(superAdmin);
    prisma.book.findUnique.mockResolvedValue(null); // isbn free
    prisma.book.create.mockImplementation(async ({ data }) => ({ id: 'book-1', ...data }));

    const res = await request(app)
      .post('/api/library/books')
      .set('Authorization', token)
      .send({ title: 'Sapiens', isbn: '9780062316110', totalCopies: 3 });

    expect(res.status).toBe(201);
    expect(prisma.book.create.mock.calls[0][0].data.availableCopies).toBe(3);
  });

  it('rejects a duplicate ISBN with 409', async () => {
    const token = signIn(superAdmin);
    prisma.book.findUnique.mockResolvedValue(book); // isbn taken

    const res = await request(app)
      .post('/api/library/books')
      .set('Authorization', token)
      .send({ title: 'Sapiens (reprint)', isbn: '9780062316110' });

    expect(res.status).toBe(409);
  });

  it('refuses to shrink totalCopies below the number on loan with 400', async () => {
    const token = signIn(superAdmin);
    prisma.book.findUnique.mockResolvedValue({ ...book, totalCopies: 4, availableCopies: 2 }); // 2 on loan

    const res = await request(app)
      .patch('/api/library/books/book-1')
      .set('Authorization', token)
      .send({ totalCopies: 1 });

    expect(res.status).toBe(400);
    expect(prisma.book.update).not.toHaveBeenCalled();
  });

  it('rejects a cashier without library.write', async () => {
    const token = signIn(restrictedAdmin);

    const res = await request(app)
      .post('/api/library/books')
      .set('Authorization', token)
      .send({ title: 'Not allowed' });

    expect(res.status).toBe(403);
  });
});

describe('library lending', () => {
  beforeEach(() => reset());

  it('issues a book and decrements availability atomically', async () => {
    const token = signIn(superAdmin);
    prisma.book.findUnique.mockResolvedValue({ ...book });
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', firstName: 'Naim' });
    prisma.book.update.mockResolvedValue({});
    prisma.bookIssue.create.mockImplementation(async ({ data }) => ({
      id: 'issue-1',
      ...data,
      book,
    }));

    const res = await request(app)
      .post('/api/library/issues')
      .set('Authorization', token)
      .send({ bookId: 'book-1', studentId: 'student-1', dueDate: '2026-11-20' });

    expect(res.status).toBe(201);
    expect(prisma.book.update.mock.calls[0][0].data.availableCopies).toEqual({ decrement: 1 });
  });

  it('rejects issuing a book with no copies available with 409', async () => {
    const token = signIn(superAdmin);
    prisma.book.findUnique.mockResolvedValue({ ...book, availableCopies: 0 });
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });

    const res = await request(app)
      .post('/api/library/issues')
      .set('Authorization', token)
      .send({ bookId: 'book-1', studentId: 'student-1', dueDate: '2026-11-20' });

    expect(res.status).toBe(409);
    expect(prisma.bookIssue.create).not.toHaveBeenCalled();
  });

  it('returns a book and increments availability', async () => {
    const token = signIn(superAdmin);
    prisma.bookIssue.findUnique.mockResolvedValue({
      id: 'issue-1',
      bookId: 'book-1',
      status: 'ISSUED',
    });
    prisma.book.update.mockResolvedValue({});
    prisma.bookIssue.update.mockResolvedValue({
      id: 'issue-1',
      status: 'RETURNED',
      fineAmount: 50,
    });

    const res = await request(app)
      .post('/api/library/issues/issue-1/return')
      .set('Authorization', token)
      .send({ fineAmount: 50 });

    expect(res.status).toBe(200);
    expect(prisma.book.update.mock.calls[0][0].data.availableCopies).toEqual({ increment: 1 });
  });

  it('refuses to delete a book with copies on loan with 409', async () => {
    const token = signIn(superAdmin);
    prisma.book.findUnique.mockResolvedValue({ ...book, _count: { issues: 2 } });

    const res = await request(app).delete('/api/library/books/book-1').set('Authorization', token);

    expect(res.status).toBe(409);
  });
});
