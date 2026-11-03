import { describe, it, expect, afterEach } from 'vitest';
import { request, app, prisma, signIn, uniqueSuffix, removeStudent } from './helpers.js';

const created = [];

afterEach(async () => {
  while (created.length) {
    await removeStudent(created.pop());
  }
});

describe('students API against a live database', () => {
  it('lists the seeded roster for the super admin', async () => {
    const token = await signIn('admin@aurora.school');

    const res = await request(app)
      .get('/api/students?limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.students.length).toBeGreaterThan(0);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(40);
  });

  it('creates, reads and archives a student end to end', async () => {
    const token = await signIn('admin@aurora.school');
    const admissionNo = `ADV-TEST-${uniqueSuffix().slice(-6).toUpperCase()}`;

    const createdRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({
        admissionNo,
        firstName: 'Integration',
        lastName: 'Testcase',
        gender: 'OTHER',
        rollNumber: 400,
      });

    expect(createdRes.status).toBe(201);
    expect(createdRes.body.data.student.admissionNo).toBe(admissionNo);
    created.push(admissionNo);

    const studentId = createdRes.body.data.student.id;
    const read = await request(app)
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(read.status).toBe(200);
    expect(read.body.data.student.firstName).toBe('Integration');

    const archived = await request(app)
      .delete(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.student.status).toBe('DROPPED');
  });

  it('rejects a duplicate admission number with 409', async () => {
    const token = await signIn('admin@aurora.school');

    const res = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .send({
        admissionNo: 'ADV-2026-0001', // seeded
        firstName: 'Duplicate',
        lastName: 'Admission',
        gender: 'MALE',
      });

    expect(res.status).toBe(409); // mapped from Prisma P2002 by the error middleware
    const check = await prisma.student.findMany({ where: { admissionNo: 'ADV-2026-0001' } });
    expect(check).toHaveLength(1);
  });

  it('rejects teachers from listing students', async () => {
    const token = await signIn('arif@aurora.school');

    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
