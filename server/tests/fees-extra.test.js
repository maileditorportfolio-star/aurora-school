import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, studentRecord, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const invoice = (id, overrides = {}) => ({
  id,
  invoiceNo: `INV-2026-0000${id.slice(-1)}`,
  studentId: studentRecord.id,
  structureId: 'structure-1',
  title: 'Tuition Fee',
  amount: 1500,
  paidAmount: 0,
  dueDate: new Date('2026-11-10'),
  month: 11,
  year: 2026,
  status: 'PENDING',
  student: {
    ...studentRecord,
    section: { id: 's1', name: 'A', schoolClass: { id: 'c1', name: 'Grade 6' } },
  },
  structure: null,
  payments: [],
  ...overrides,
});

describe('GET /api/fees/invoices', () => {
  beforeEach(() => reset());

  it('returns the paginated ledger for staff', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.count.mockResolvedValue(1);
    prisma.feeInvoice.findMany.mockResolvedValue([invoice('invoice-1')]);

    const res = await request(app)
      .get('/api/fees/invoices?page=1&limit=10')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 10, total: 1, pages: 1 });
    expect(res.body.data.invoices[0].invoiceNo).toBe('INV-2026-00001');
    expect(res.body.data.invoices[0].isOverdue).toBe(false); // due in the future
  });

  it('filters by status', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.count.mockResolvedValue(0);
    prisma.feeInvoice.findMany.mockResolvedValue([]);

    await request(app).get('/api/fees/invoices?status=PAID').set('Authorization', token);

    expect(prisma.feeInvoice.findMany.mock.calls[0][0].where.status).toBe('PAID');
  });

  it('flags overdue invoices in the response', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.count.mockResolvedValue(1);
    prisma.feeInvoice.findMany.mockResolvedValue([
      invoice('invoice-1', { dueDate: new Date('2020-01-01') }),
    ]);

    const res = await request(app).get('/api/fees/invoices').set('Authorization', token);

    expect(res.body.data.invoices[0].isOverdue).toBe(true);
  });
});

describe('POST /api/fees/invoices (one-off)', () => {
  beforeEach(() => reset());

  it('creates an invoice for an existing student', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue(studentRecord);
    prisma.feeInvoice.count.mockResolvedValue(41);
    prisma.feeInvoice.create.mockImplementation(async ({ data }) => ({
      id: 'invoice-9',
      ...data,
      payments: [],
    }));

    const res = await request(app).post('/api/fees/invoices').set('Authorization', token).send({
      studentId: studentRecord.id,
      title: 'Lab damage deposit',
      amount: 1000,
      dueDate: '2026-12-01',
    });

    expect(res.status).toBe(201);
    expect(prisma.feeInvoice.create.mock.calls[0][0].data.invoiceNo).toMatch(/^INV-\d{4}-\d{5}$/);
  });

  it('rejects an unknown student with 404', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/fees/invoices')
      .set('Authorization', token)
      .send({ studentId: 'nope', title: 'X', amount: 100, dueDate: '2026-12-01' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/fees/students/:studentId/summary', () => {
  beforeEach(() => reset());

  it('aggregates billed, paid, due and open counts', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue(studentRecord);
    prisma.feeInvoice.findMany.mockResolvedValue([
      invoice('invoice-1', { amount: 1500, paidAmount: 1500, status: 'PAID' }),
      invoice('invoice-2', { amount: 1500, paidAmount: 0, status: 'PENDING' }),
      invoice('invoice-3', { amount: 800, paidAmount: 0, status: 'WAIVED' }),
    ]);

    const res = await request(app)
      .get(`/api/fees/students/${studentRecord.id}/summary`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.totals).toEqual({ billed: 3800, paid: 1500, due: 2300, open: 1 });
  });
});

describe('GET /api/fees/receipts/:paymentId', () => {
  beforeEach(() => reset());

  it('returns the receipt payload', async () => {
    const token = signIn(superAdmin);
    prisma.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      amount: 1500,
      method: 'BKASH',
      reference: 'BK123',
      createdAt: new Date('2026-11-03'),
      invoice: { ...invoice('invoice-1'), student: studentRecord },
      receivedBy: { name: 'Office Admin' },
    });

    const res = await request(app).get('/api/fees/receipts/payment-1').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.receipt.method).toBe('BKASH');
  });

  it('rejects a missing receipt with 404', async () => {
    const token = signIn(superAdmin);
    prisma.payment.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/fees/receipts/nope').set('Authorization', token);

    expect(res.status).toBe(404);
  });
});
