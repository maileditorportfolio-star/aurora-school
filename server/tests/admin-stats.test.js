import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, restrictedAdmin, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const analyticsAdmin = {
  id: 'user-analyst',
  name: 'Data Admin',
  email: 'data@aurora.school',
  role: 'ADMIN',
  permissions: ['analytics.read'],
  avatarUrl: null,
};

const stubHappyPath = () => {
  prisma.student.count.mockResolvedValue(40);
  prisma.user.count.mockResolvedValue(8);
  prisma.schoolClass.count.mockResolvedValue(10);
  prisma.section.count.mockResolvedValue(20);
  prisma.attendance.findMany.mockResolvedValue([
    { status: 'PRESENT' },
    { status: 'PRESENT' },
    { status: 'LATE' },
    { status: 'ABSENT' },
    { status: 'PRESENT' },
  ]);
  prisma.feeInvoice.findMany.mockResolvedValue([
    { amount: 1500, paidAmount: 0, studentId: 'student-1' },
    { amount: 1500, paidAmount: 500, studentId: 'student-2' },
    { amount: 800, paidAmount: 0, studentId: 'student-1' },
  ]);
  prisma.feeInvoice.aggregate
    .mockResolvedValueOnce({ _sum: { amount: 120000 } })
    .mockResolvedValueOnce({ _sum: { paidAmount: 55500 } });
  prisma.student.findMany.mockResolvedValue([
    { id: 'student-1', firstName: 'Anik', lastName: 'Chowdhury', admissionNo: 'ADV-2026-0009' },
    { id: 'student-2', firstName: 'Fahim', lastName: 'Rahman', admissionNo: 'ADV-2026-0037' },
  ]);
  prisma.$queryRaw
    .mockResolvedValueOnce([{ day: new Date('2026-11-02'), present: BigInt(9), total: BigInt(10) }])
    .mockResolvedValueOnce([{ month: '2026-11', collected: 55500 }]);
  prisma.section.findMany.mockResolvedValue([
    { id: 's1', name: 'A', _count: { students: 10 }, schoolClass: { name: 'Grade 6' } },
    { id: 's2', name: 'B', _count: { students: 10 }, schoolClass: { name: 'Grade 6' } },
    { id: 's3', name: 'A', _count: { students: 7 }, schoolClass: { name: 'Grade 7' } },
  ]);
};

describe('GET /api/admin/stats', () => {
  beforeEach(() => reset());

  it('rejects staff without analytics.read', async () => {
    const token = signIn(restrictedAdmin);

    const res = await request(app).get('/api/admin/stats').set('Authorization', token);

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/stats');

    expect(res.status).toBe(401);
  });

  it('returns the composite dashboard payload', async () => {
    stubHappyPath();
    const token = signIn(analyticsAdmin);

    const res = await request(app).get('/api/admin/stats').set('Authorization', token);

    expect(res.status).toBe(200);
    const { totals, attendanceTrend, collectionsByMonth, classStrength, topDefaulters } =
      res.body.data;

    expect(totals.students).toBe(40);
    expect(totals.presentToday).toBe(4); // 3 present + 1 late
    expect(totals.attendanceRate).toBe(80);
    expect(totals.billed).toBe(120000);
    expect(totals.collected).toBe(55500);
    expect(totals.outstanding).toBeCloseTo(1500 + 1000 + 800);

    expect(attendanceTrend).toEqual([{ date: '2026-11-02', present: 9, total: 10 }]);
    expect(collectionsByMonth).toEqual([{ month: '2026-11', collected: 55500 }]);

    // Grade 6 wins with 20 students across sections A and B.
    expect(classStrength[0]).toEqual({ name: 'Grade 6', students: 20 });

    // Both children owe money; student-1 owes 2300 across two rows.
    const first = topDefaulters.find((row) => row.studentId === 'student-1');
    expect(first.due).toBe(2300);
    expect(topDefaulters[0].studentId).toBe('student-1');
  });

  it('lets the super admin in without the permission', async () => {
    stubHappyPath();
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/admin/stats').set('Authorization', token);

    expect(res.status).toBe(200);
  });
});
