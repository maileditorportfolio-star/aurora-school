import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import {
  setupApp,
  superAdmin,
  admin,
  teacher,
  student,
  grade6A,
  studentRecord,
  tokenFor,
} from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

describe('GET /api/students', () => {
  beforeEach(() => reset());

  it('returns a paginated roster for staff', async () => {
    const token = signIn(superAdmin);
    prisma.student.count.mockResolvedValue(1);
    prisma.student.findMany.mockResolvedValue([
      { ...studentRecord, section: grade6A, guardians: [] },
    ]);

    const res = await request(app).get('/api/students?page=1&limit=10').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 10, total: 1, pages: 1 });
  });

  it('applies the search term across name and admission number', async () => {
    const token = signIn(superAdmin);
    prisma.student.count.mockResolvedValue(0);
    prisma.student.findMany.mockResolvedValue([]);

    await request(app).get('/api/students?search=naim').set('Authorization', token);

    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { firstName: { contains: 'naim' } },
        { lastName: { contains: 'naim' } },
        { admissionNo: { contains: 'naim' } },
      ]),
    );
  });

  it('filters by section and status', async () => {
    const token = signIn(superAdmin);
    prisma.student.count.mockResolvedValue(0);
    prisma.student.findMany.mockResolvedValue([]);

    await request(app)
      .get(`/api/students?sectionId=${grade6A.id}&status=ACTIVE`)
      .set('Authorization', token);

    const where = prisma.student.findMany.mock.calls[0][0].where;
    expect(where.sectionId).toBe(grade6A.id);
    expect(where.status).toBe('ACTIVE');
  });

  it('rejects teachers and portal users', async () => {
    const asTeacher = await request(app).get('/api/students').set('Authorization', signIn(teacher));
    expect(asTeacher.status).toBe(403);

    prisma.user.findUnique.mockResolvedValue(student);
    const asStudent = await request(app)
      .get('/api/students')
      .set('Authorization', tokenFor(student));
    expect(asStudent.status).toBe(403);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/students');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/students/:id', () => {
  beforeEach(() => reset());

  it('returns the student with attendance rate', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue({
      ...studentRecord,
      section: grade6A,
      guardians: [],
      transport: null,
      user: null,
    });
    prisma.attendance.findMany.mockResolvedValue([
      { status: 'PRESENT' },
      { status: 'PRESENT' },
      { status: 'ABSENT' },
      { status: 'LATE' },
    ]);

    const res = await request(app)
      .get(`/api/students/${studentRecord.id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.student.admissionNo).toBe('ADV-2026-0001');
    expect(res.body.data.attendance.rate).toBe(75);
  });

  it('returns 404 for an unknown student', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/students/nope').set('Authorization', token);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/students', () => {
  beforeEach(() => reset());

  it('creates a student with an auto-generated admission number', async () => {
    const token = signIn(superAdmin);
    prisma.student.count.mockResolvedValue(40);
    prisma.student.findFirst.mockResolvedValue(null); // roll number is free
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        student: {
          create: vi.fn().mockResolvedValue({ id: 'student-new' }),
          findUnique: vi.fn().mockResolvedValue({
            ...studentRecord,
            id: 'student-new',
            section: grade6A,
            guardians: [],
          }),
        },
        guardian: { create: vi.fn().mockResolvedValue({ id: 'guardian-1' }) },
      };
      return callback(tx);
    });

    const res = await request(app).post('/api/students').set('Authorization', token).send({
      firstName: 'Naim',
      lastName: 'Khan',
      gender: 'MALE',
      sectionId: grade6A.id,
      rollNumber: 11,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.student.admissionNo).toBe('ADV-2026-0001'); // preset in fixture
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a duplicate roll number in the same section with 409', async () => {
    const token = signIn(superAdmin);
    prisma.student.findFirst.mockResolvedValue({ id: 'existing' });

    const res = await request(app).post('/api/students').set('Authorization', token).send({
      firstName: 'Naim',
      lastName: 'Khan',
      gender: 'MALE',
      sectionId: grade6A.id,
      rollNumber: 1,
    });

    expect(res.status).toBe(409);
  });

  it('rejects a standard admin without students.write', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...admin, permissions: ['fees.write'] });

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', tokenFor({ ...admin, permissions: ['fees.write'] }))
      .send({ firstName: 'Naim', lastName: 'Khan', gender: 'MALE' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/students/:id (archive)', () => {
  beforeEach(() => reset());

  it('soft-deletes by setting the status to DROPPED', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue(studentRecord);
    prisma.student.update.mockResolvedValue({
      ...studentRecord,
      status: 'DROPPED',
      section: grade6A,
      guardians: [],
    });

    const res = await request(app)
      .delete(`/api/students/${studentRecord.id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(prisma.student.update.mock.calls[0][0].data.status).toBe('DROPPED');
  });
});
