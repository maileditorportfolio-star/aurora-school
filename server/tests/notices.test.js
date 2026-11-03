import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import {
  setupApp,
  superAdmin,
  admin,
  restrictedAdmin,
  teacher,
  student,
  tokenFor,
} from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

describe('GET /api/notices/public', () => {
  beforeEach(() => reset());

  it('returns live notices without authentication', async () => {
    prisma.notice.findMany.mockResolvedValue([{ id: 'notice-1', title: 'Assembly moved' }]);

    const res = await request(app).get('/api/notices/public');

    expect(res.status).toBe(200);
    expect(res.body.data.notices).toHaveLength(1);

    // Only family-safe audiences, nothing expired.
    const where = prisma.notice.findMany.mock.calls[0][0].where;
    expect(where.audience.in).toEqual(['ALL', 'STUDENTS', 'PARENTS']);
    expect(where.OR).toEqual([{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }]);
  });
});

describe('notice management permissions', () => {
  beforeEach(() => reset());

  it('rejects a cashier without notices.write', async () => {
    const token = signIn(restrictedAdmin); // only fees.write

    const res = await request(app)
      .post('/api/notices')
      .set('Authorization', token)
      .send({ title: 'Unauthorised', body: 'Should not be created' });

    expect(res.status).toBe(403);
    expect(prisma.notice.create).not.toHaveBeenCalled();
  });

  it('rejects a teacher (not staff) even on read — staff only', async () => {
    const token = signIn(teacher);

    const res = await request(app).get('/api/notices').set('Authorization', token);

    expect(res.status).toBe(403);
  });

  it('creates a notice for a permitted admin', async () => {
    const permitted = { ...admin, permissions: [...admin.permissions, 'notices.write'] };
    const token = signIn(permitted);
    prisma.notice.create.mockResolvedValue({ id: 'notice-1', title: 'Fee reminder' });

    const res = await request(app).post('/api/notices').set('Authorization', token).send({
      title: 'Fee reminder',
      body: 'Tuition due by the 10th.',
      priority: 'IMPORTANT',
      audience: 'PARENTS',
    });

    expect(res.status).toBe(201);
    const data = prisma.notice.create.mock.calls[0][0].data;
    expect(data.priority).toBe('IMPORTANT');
    expect(data.audience).toBe('PARENTS');
  });

  it('creates and validates events with endAt after startAt', async () => {
    const token = signIn(superAdmin);

    const bad = await request(app).post('/api/events').set('Authorization', token).send({
      title: 'Sports day',
      startAt: '2026-11-20T09:00:00.000Z',
      endAt: '2026-11-20T08:00:00.000Z',
    });

    expect(bad.status).toBe(400);

    prisma.event.create.mockResolvedValue({ id: 'event-1', title: 'Sports day' });
    const ok = await request(app).post('/api/events').set('Authorization', token).send({
      title: 'Sports day',
      startAt: '2026-11-20T09:00:00.000Z',
      endAt: '2026-11-20T13:00:00.000Z',
      location: 'School field',
    });

    expect(ok.status).toBe(201);
  });
});

describe('portal notices audience', () => {
  beforeEach(() => reset());

  it('students see ALL and STUDENTS notices only', async () => {
    const token = signIn(student);
    prisma.notice.findMany.mockResolvedValue([]);

    await request(app).get('/api/portal/notices').set('Authorization', token);

    const where = prisma.notice.findMany.mock.calls[0][0].where;
    expect(where.audience.in).toEqual(['ALL', 'STUDENTS']);
  });

  it('teachers see ALL, TEACHERS and STAFF notices', async () => {
    const token = signIn(teacher);
    prisma.notice.findMany.mockResolvedValue([]);

    await request(app).get('/api/portal/notices').set('Authorization', token);

    const where = prisma.notice.findMany.mock.calls[0][0].where;
    expect(where.audience.in).toEqual(['ALL', 'TEACHERS', 'STAFF']);
  });
});
