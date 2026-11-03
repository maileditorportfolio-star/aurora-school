import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  setupApp,
  superAdmin,
  restrictedAdmin,
  teacher,
  grade6A,
  studentRecord,
  tokenFor,
} from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const otherStudent = {
  ...studentRecord,
  id: 'student-2',
  admissionNo: 'ADV-2026-0002',
  rollNumber: 2,
};

describe('POST /api/attendance/mark', () => {
  beforeEach(() => reset());

  const payload = {
    sectionId: grade6A.id,
    date: '2026-11-02',
    entries: [
      { studentId: studentRecord.id, status: 'PRESENT' },
      { studentId: otherStudent.id, status: 'ABSENT' },
    ],
  };

  it('marks the register for staff', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }, { id: otherStudent.id }]);
    prisma.attendance.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.marked).toBe(2);
    expect(prisma.attendance.upsert).toHaveBeenCalledTimes(2);

    const first = prisma.attendance.upsert.mock.calls[0][0];
    expect(first.where.studentId_date.studentId).toBe(studentRecord.id);
    expect(first.create.status).toBe('PRESENT');
  });

  it('lets a teacher mark a section they are assigned to', async () => {
    const token = signIn(teacher);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.subjectAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' });
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }, { id: otherStudent.id }]);
    prisma.attendance.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(200);
  });

  it('rejects a teacher who is not assigned to the section', async () => {
    const token = signIn(teacher);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.subjectAssignment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(403);
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
  });

  it('rejects entries for students outside the section with 400', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]); // one missing

    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(400);
    expect(prisma.attendance.upsert).not.toHaveBeenCalled();
  });

  it('rejects an unknown section with 404', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(404);
  });

  it('rejects a cashier without attendance access is still allowed as staff', async () => {
    // Cashiers are staff (ADMIN) — the staff-or-teacher guard passes; they are trusted at the office.
    const token = signIn(restrictedAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }, { id: otherStudent.id }]);
    prisma.attendance.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(200);
  });
});

describe('GET /api/attendance', () => {
  beforeEach(() => reset());

  it('returns the roster merged with existing marks', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([
      { ...studentRecord, section: grade6A },
      { ...otherStudent, section: grade6A },
    ]);
    prisma.attendance.findMany.mockResolvedValue([
      { studentId: studentRecord.id, status: 'PRESENT' },
    ]);

    const res = await request(app)
      .get(`/api/attendance?sectionId=${grade6A.id}&date=2026-11-02`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const rows = res.body.data.students;
    expect(rows.find((r) => r.id === studentRecord.id).status).toBe('PRESENT');
    expect(rows.find((r) => r.id === otherStudent.id).status).toBeNull();
  });

  it('requires the sectionId parameter', async () => {
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/attendance').set('Authorization', token);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/attendance/summary', () => {
  beforeEach(() => reset());

  it('computes per-student present + late counts and a rate', async () => {
    const token = signIn(superAdmin);
    prisma.student.findMany.mockResolvedValue([{ ...studentRecord }, { ...otherStudent }]);
    prisma.attendance.findMany.mockResolvedValue([
      { studentId: studentRecord.id, status: 'PRESENT' },
      { studentId: studentRecord.id, status: 'LATE' },
      { studentId: studentRecord.id, status: 'ABSENT' },
      { studentId: studentRecord.id, status: 'PRESENT' },
      { studentId: otherStudent.id, status: 'ABSENT' },
    ]);

    const res = await request(app)
      .get(`/api/attendance/summary?sectionId=${grade6A.id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const rows = res.body.data.students;
    const first = rows.find((r) => r.id === studentRecord.id);
    expect(first.total).toBe(4);
    expect(first.rate).toBe(75); // 3 of 4 present or late
    expect(rows.find((r) => r.id === otherStudent.id).rate).toBe(0);
  });
});
