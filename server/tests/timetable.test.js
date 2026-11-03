import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, admin, teacher, grade6A, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const validSlot = (overrides = {}) => ({
  dayOfWeek: 0,
  periodNo: 1,
  startTime: '08:30',
  endTime: '09:15',
  kind: 'CLASS',
  subjectId: 'subject-math',
  teacherId: 'user-teacher',
  ...overrides,
});

describe('PUT /api/timetable/slots', () => {
  beforeEach(() => reset());

  it('replaces the whole grid for a section', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.$transaction.mockResolvedValue([]);
    prisma.timetableSlot.findMany.mockResolvedValue([{ id: 'slot-1', ...validSlot() }]);

    const res = await request(app)
      .put('/api/timetable/slots')
      .set('Authorization', token)
      .send({
        sectionId: grade6A.id,
        slots: [validSlot(), validSlot({ periodNo: 2, startTime: '09:15', endTime: '10:00' })],
      });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(res.body.data.slots.length).toBeGreaterThan(0);
  });

  it('rejects duplicate day+period pairs with 400', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);

    const res = await request(app)
      .put('/api/timetable/slots')
      .set('Authorization', token)
      .send({ sectionId: grade6A.id, slots: [validSlot(), validSlot()] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/duplicate/i);
  });

  it('rejects an end time before the start time with 400', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);

    const res = await request(app)
      .put('/api/timetable/slots')
      .set('Authorization', token)
      .send({
        sectionId: grade6A.id,
        slots: [validSlot({ startTime: '09:15', endTime: '08:30' })],
      });

    expect(res.status).toBe(400);
  });

  it('rejects a cashier without timetable.write', async () => {
    const cashier = { ...admin, permissions: ['fees.write'] };
    const token = signIn(cashier);
    prisma.section.findUnique.mockResolvedValue(grade6A);

    const res = await request(app)
      .put('/api/timetable/slots')
      .set('Authorization', token)
      .send({ sectionId: grade6A.id, slots: [validSlot()] });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/timetable', () => {
  beforeEach(() => reset());

  it('returns the section grid with teacher names resolved', async () => {
    const token = signIn(superAdmin);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot-1',
        ...validSlot(),
        dayOfWeek: 0,
        periodNo: 1,
        kind: 'CLASS',
        room: 'Room 6A',
        subject: { id: 'subject-math', name: 'Mathematics', code: 'MAT101' },
      },
    ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-teacher', name: 'Arif Hossain' }]);

    const res = await request(app)
      .get(`/api/timetable?sectionId=${grade6A.id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.slots[0].teacherName).toBe('Arif Hossain');
    expect(res.body.data.section.className).toBe('Grade 6');
  });

  it('requires the sectionId parameter', async () => {
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/timetable').set('Authorization', token);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/timetable/teacher', () => {
  beforeEach(() => reset());

  it("returns only the signed-in teacher's grid", async () => {
    const token = signIn(teacher);
    prisma.timetableSlot.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/timetable/teacher').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(prisma.timetableSlot.findMany.mock.calls[0][0].where.teacherId).toBe(teacher.id);
  });

  it('rejects staff from the teacher-only endpoint', async () => {
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/timetable/teacher').set('Authorization', token);

    expect(res.status).toBe(403);
  });
});
