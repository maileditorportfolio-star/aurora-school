import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  setupApp,
  superAdmin,
  teacher,
  student,
  parent,
  grade6A,
  studentRecord,
  tokenFor,
} from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const sibling = {
  ...studentRecord,
  id: 'student-2',
  admissionNo: 'ADV-2026-0002',
  firstName: 'Trisha',
  gender: 'FEMALE',
  rollNumber: 2,
};

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

describe('GET /api/portal/overview', () => {
  beforeEach(() => reset());

  it('rejects staff accounts — the portal is for families', async () => {
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/portal/overview').set('Authorization', token);

    expect(res.status).toBe(403);
  });

  it('rejects teachers with the portal guard', async () => {
    const token = signIn(teacher);

    const res = await request(app).get('/api/portal/overview').set('Authorization', token);

    expect(res.status).toBe(403);
  });

  it('returns the linked student for a student account', async () => {
    const token = signIn(student);
    prisma.student.findUnique.mockResolvedValueOnce(studentRecord); // portalStudentIds (userId lookup)
    prisma.student.findMany.mockResolvedValue([{ ...studentRecord, section: grade6A }]); // children list
    prisma.attendance.findMany.mockResolvedValue([
      { status: 'PRESENT' },
      { status: 'LATE' },
      { status: 'ABSENT' },
    ]);
    prisma.feeInvoice.findMany.mockResolvedValue([
      { studentId: studentRecord.id, amount: 1500, paidAmount: 0, status: 'PENDING' },
    ]);
    prisma.exam.findMany.mockResolvedValue([]);
    prisma.mark.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/portal/overview').set('Authorization', token);

    expect(res.status).toBe(200);
    const [child] = res.body.data.students;
    expect(child.admissionNo).toBe('ADV-2026-0001');
    expect(child.attendanceRate).toBe(67); // 2 of 3 present or late
    expect(child.fees.due).toBe(1500);
    expect(child.fees.open).toBe(1);
  });

  it('returns both children for a parent account', async () => {
    const token = signIn(parent);
    prisma.guardian.findMany.mockResolvedValue([
      { studentId: studentRecord.id },
      { studentId: sibling.id },
    ]);
    prisma.student.findMany.mockResolvedValue([
      { ...studentRecord, section: grade6A },
      { ...sibling, section: grade6A },
    ]);
    prisma.attendance.findMany.mockResolvedValue([]);
    prisma.feeInvoice.findMany.mockResolvedValue([]);
    prisma.exam.findMany.mockResolvedValue([]);
    prisma.mark.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/portal/overview').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(2);
  });
});

describe('portal scope enforcement', () => {
  beforeEach(() => reset());

  it("forbids a student requesting another student's records", async () => {
    const token = signIn(student);
    prisma.student.findUnique.mockResolvedValue(studentRecord); // only own student allowed
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]);

    const res = await request(app)
      .get('/api/portal/attendance?studentId=student-2')
      .set('Authorization', token);

    expect(res.status).toBe(403);
  });

  it('allows a parent to request either child explicitly', async () => {
    const token = signIn(parent);
    prisma.guardian.findMany.mockResolvedValue([
      { studentId: studentRecord.id },
      { studentId: sibling.id },
    ]);
    prisma.student.findUnique.mockResolvedValue({ ...sibling, section: grade6A });
    prisma.attendance.findMany.mockResolvedValue([
      { status: 'PRESENT', date: new Date('2026-11-02') },
    ]);

    const res = await request(app)
      .get('/api/portal/attendance?studentId=student-2')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.records).toHaveLength(1);
  });
});

describe('GET /api/portal/fees', () => {
  beforeEach(() => reset());

  it('returns totals and invoices with overdue flags', async () => {
    const token = signIn(student);
    prisma.student.findUnique.mockResolvedValue(studentRecord); // own profile
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]);
    prisma.feeInvoice.findMany.mockResolvedValue([
      {
        id: 'invoice-1',
        invoiceNo: 'INV-2026-00001',
        title: 'Tuition Fee (October 2026)',
        amount: 1500,
        paidAmount: 1500,
        dueDate: new Date('2026-10-10'),
        status: 'PAID',
        studentId: studentRecord.id,
        payments: [{ id: 'payment-1', amount: 1500, method: 'BKASH', createdAt: new Date() }],
      },
      {
        id: 'invoice-2',
        invoiceNo: 'INV-2026-00002',
        title: 'Tuition Fee (November 2026)',
        amount: 1500,
        paidAmount: 0,
        dueDate: new Date('2020-01-01'), // long overdue
        status: 'PENDING',
        studentId: studentRecord.id,
        payments: [],
      },
    ]);

    const res = await request(app).get('/api/portal/fees').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.totals).toEqual({ billed: 3000, paid: 1500, due: 1500 });
    const overdue = res.body.data.invoices.find((i) => i.id === 'invoice-2');
    expect(overdue.isOverdue).toBe(true);
  });
});
