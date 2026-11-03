import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  setupApp,
  superAdmin,
  restrictedAdmin,
  teacher,
  studentRecord,
  tokenFor,
} from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const invoice = {
  id: 'invoice-1',
  invoiceNo: 'INV-2026-00001',
  studentId: studentRecord.id,
  structureId: 'structure-1',
  title: 'Tuition Fee',
  amount: 1500,
  paidAmount: 0,
  dueDate: new Date('2026-10-10'),
  month: 10,
  year: 2026,
  status: 'PENDING',
  student: studentRecord,
  structure: null,
  payments: [],
};

describe('fee structures', () => {
  beforeEach(() => reset());

  it('creates a structure for staff with fees.write', async () => {
    const token = signIn(superAdmin);
    prisma.feeStructure.create.mockResolvedValue({ id: 'structure-1', name: 'Tuition Fee' });

    const res = await request(app)
      .post('/api/fees/structures')
      .set('Authorization', token)
      .send({ name: 'Tuition Fee', amount: 1500, frequency: 'MONTHLY', dueDay: 10 });

    expect(res.status).toBe(201);
  });

  it('allows a cashier with fees.write to create a structure', async () => {
    const token = signIn(restrictedAdmin);
    prisma.feeStructure.create.mockResolvedValue({ id: 'structure-2', name: 'Exam Fee' });

    const res = await request(app)
      .post('/api/fees/structures')
      .set('Authorization', token)
      .send({ name: 'Exam Fee', amount: 800, frequency: 'ANNUAL' });

    expect(res.status).toBe(201);
  });
});

describe('POST /api/fees/invoices/generate', () => {
  beforeEach(() => reset());

  it('creates invoices for active students and skips already-billed ones', async () => {
    const token = signIn(superAdmin);
    prisma.feeStructure.findUnique.mockResolvedValue({
      id: 'structure-1',
      name: 'Tuition Fee',
      amount: 1500,
      frequency: 'MONTHLY',
      dueDay: 10,
      classId: null,
      academicYearId: 'year-1',
    });
    prisma.student.findMany.mockResolvedValue([
      { id: 'student-1' },
      { id: 'student-2' },
      { id: 'student-3' },
    ]);
    prisma.feeInvoice.findMany.mockResolvedValue([{ studentId: 'student-2' }]);
    prisma.feeInvoice.count.mockResolvedValue(41);
    prisma.feeInvoice.createMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/api/fees/invoices/generate')
      .set('Authorization', token)
      .send({ structureId: 'structure-1', month: 11, year: 2026 });

    expect(res.status).toBe(201);
    expect(res.body.data.created).toBe(2);
    expect(res.body.data.skipped).toBe(1);
    expect(res.body.data.total).toBe(3);

    const rows = prisma.feeInvoice.createMany.mock.calls[0][0].data;
    expect(rows.map((r) => r.studentId)).toEqual(['student-1', 'student-3']);
    expect(rows[0].invoiceNo).toMatch(/^INV-\d{4}-\d{5}$/);
  });

  it('rejects an unknown structure with 404', async () => {
    const token = signIn(superAdmin);
    prisma.feeStructure.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/fees/invoices/generate')
      .set('Authorization', token)
      .send({ structureId: 'nope', month: 11, year: 2026 });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/fees/invoices/:id/payments', () => {
  beforeEach(() => reset());

  it('records a partial payment and marks the invoice PARTIAL', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice });
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
    prisma.feeInvoice.update.mockResolvedValue({
      ...invoice,
      paidAmount: 500,
      status: 'PARTIAL',
      payments: [{ id: 'payment-1' }],
    });

    const res = await request(app)
      .post('/api/fees/invoices/invoice-1/payments')
      .set('Authorization', token)
      .send({ amount: 500, method: 'BKASH', reference: 'BK123' });

    expect(res.status).toBe(201);

    const txUpdate = prisma.feeInvoice.update.mock.calls[0][0];
    expect(txUpdate.data).toEqual({ paidAmount: 500, status: 'PARTIAL' });
  });

  it('marks the invoice PAID when the balance is cleared', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice, paidAmount: 1000 });
    prisma.payment.create.mockResolvedValue({ id: 'payment-2' });
    prisma.feeInvoice.update.mockResolvedValue({
      ...invoice,
      paidAmount: 1500,
      status: 'PAID',
      payments: [{ id: 'payment-2' }],
    });

    const res = await request(app)
      .post('/api/fees/invoices/invoice-1/payments')
      .set('Authorization', token)
      .send({ amount: 500, method: 'CASH' });

    expect(res.status).toBe(201);
    expect(prisma.feeInvoice.update.mock.calls[0][0].data.status).toBe('PAID');
  });

  it('rejects an overpayment with 400', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice, paidAmount: 1400 });

    const res = await request(app)
      .post('/api/fees/invoices/invoice-1/payments')
      .set('Authorization', token)
      .send({ amount: 200, method: 'CASH' });

    expect(res.status).toBe(400);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects payments on waived invoices with 400', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice, status: 'WAIVED' });

    const res = await request(app)
      .post('/api/fees/invoices/invoice-1/payments')
      .set('Authorization', token)
      .send({ amount: 100, method: 'CASH' });

    expect(res.status).toBe(400);
  });
});

describe('waive and delete rules', () => {
  beforeEach(() => reset());

  it('waives an unpaid invoice', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice });
    prisma.feeInvoice.update.mockResolvedValue({ ...invoice, status: 'WAIVED', payments: [] });

    const res = await request(app)
      .post('/api/fees/invoices/invoice-1/waive')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(prisma.feeInvoice.update.mock.calls[0][0].data.status).toBe('WAIVED');
  });

  it('refuses to waive a paid invoice with 400', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice, status: 'PAID' });

    const res = await request(app)
      .post('/api/fees/invoices/invoice-1/waive')
      .set('Authorization', token);

    expect(res.status).toBe(400);
  });

  it('refuses to delete an invoice with payments with 409', async () => {
    const token = signIn(superAdmin);
    prisma.feeInvoice.findUnique.mockResolvedValue({ ...invoice, _count: { payments: 1 } });

    const res = await request(app)
      .delete('/api/fees/invoices/invoice-1')
      .set('Authorization', token);

    expect(res.status).toBe(409);
    expect(prisma.feeInvoice.delete).not.toHaveBeenCalled();
  });
});

describe('fee access control', () => {
  beforeEach(() => reset());

  it('rejects a teacher reading invoices with 403', async () => {
    const token = signIn(teacher);

    const res = await request(app).get('/api/fees/invoices').set('Authorization', token);

    expect(res.status).toBe(403);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/fees/invoices');

    expect(res.status).toBe(401);
  });
});
