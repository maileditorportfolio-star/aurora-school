import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, restrictedAdmin, teacher, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

describe('class tree', () => {
  beforeEach(() => reset());

  it('returns classes with sections and subjects for staff', async () => {
    const token = signIn(superAdmin);
    prisma.schoolClass.findMany.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Grade 6',
        order: 6,
        sections: [{ id: 'section-1', name: 'A', _count: { students: 10 } }],
        classSubjects: [{ subject: { id: 'subject-1', name: 'Mathematics', code: 'MAT101' } }],
      },
    ]);

    const res = await request(app).get('/api/classes').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.classes[0].sections[0].studentCount).toBe(10);
    expect(res.body.data.classes[0].subjects[0].name).toBe('Mathematics');
  });

  it('lets teachers read the class structure but not modify it', async () => {
    const token = signIn(teacher);
    prisma.schoolClass.findMany.mockResolvedValue([]);

    const read = await request(app).get('/api/classes').set('Authorization', token);
    expect(read.status).toBe(200);

    const write = await request(app)
      .post('/api/classes')
      .set('Authorization', token)
      .send({ name: 'Grade 11', order: 11 });
    expect(write.status).toBe(403);
  });

  it('rejects a duplicate class name with 409', async () => {
    const token = signIn(superAdmin);
    prisma.schoolClass.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/classes')
      .set('Authorization', token)
      .send({ name: 'Grade 6' });

    expect(res.status).toBe(409);
  });
});

describe('sections', () => {
  beforeEach(() => reset());

  it('creates a section with an uppercased name', async () => {
    const token = signIn(superAdmin);
    prisma.schoolClass.findUnique.mockResolvedValue({ id: 'class-1', name: 'Grade 6' });
    prisma.section.findUnique.mockResolvedValue(null);
    prisma.section.create.mockImplementation(async ({ data }) => ({ id: 'section-1', ...data }));

    const res = await request(app)
      .post('/api/sections')
      .set('Authorization', token)
      .send({ classId: 'class-1', name: 'c' });

    expect(res.status).toBe(201);
    expect(prisma.section.create.mock.calls[0][0].data.name).toBe('C');
  });

  it('rejects deleting a section with students with 409', async () => {
    const token = signIn(superAdmin);
    prisma.student.count.mockResolvedValue(12);

    const res = await request(app).delete('/api/sections/section-1').set('Authorization', token);

    expect(res.status).toBe(409);
    expect(prisma.section.delete).not.toHaveBeenCalled();
  });
});

describe('subjects', () => {
  beforeEach(() => reset());

  it('creates a subject with the code uppercased', async () => {
    const token = signIn(superAdmin);
    prisma.subject.findUnique.mockResolvedValue(null);
    prisma.subject.create.mockImplementation(async ({ data }) => ({ id: 'subject-1', ...data }));

    const res = await request(app)
      .post('/api/subjects')
      .set('Authorization', token)
      .send({ name: 'Physics', code: 'phy101' });

    expect(res.status).toBe(201);
    expect(prisma.subject.create.mock.calls[0][0].data.code).toBe('PHY101');
  });

  it('rejects a duplicate subject code with 409', async () => {
    const token = signIn(superAdmin);
    prisma.subject.findUnique.mockResolvedValue({ id: 'existing', code: 'PHY101' });

    const res = await request(app)
      .post('/api/subjects')
      .set('Authorization', token)
      .send({ name: 'Physics', code: 'phy101' });

    expect(res.status).toBe(409);
  });

  it('rejects a cashier without classes.write', async () => {
    const token = signIn(restrictedAdmin);

    const res = await request(app)
      .post('/api/subjects')
      .set('Authorization', token)
      .send({ name: 'Physics', code: 'PHY101' });

    expect(res.status).toBe(403);
  });
});

describe('subject assignments', () => {
  beforeEach(() => reset());

  it('creates a class-wide assignment', async () => {
    const token = signIn(superAdmin);
    prisma.schoolClass.findUnique.mockResolvedValue({ id: 'class-1', name: 'Grade 6' });
    prisma.subject.findUnique.mockResolvedValue({
      id: 'subject-1',
      name: 'Mathematics',
      code: 'MAT101',
    });
    // Guard already consumed one findUnique call; the controller's teacher lookup comes next.
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValue({
      id: 'teacher-1',
      role: 'TEACHER',
      name: 'Arif',
      email: 'a@aurora.school',
    });
    prisma.subjectAssignment.findFirst.mockResolvedValue(null);
    prisma.subjectAssignment.create.mockResolvedValue({ id: 'assignment-1' });

    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', token)
      .send({ classId: 'class-1', subjectId: 'subject-1', teacherId: 'teacher-1' });

    expect(res.status).toBe(201);
  });

  it('rejects an assignment to a non-teacher with 400', async () => {
    const token = signIn(superAdmin);
    prisma.schoolClass.findUnique.mockResolvedValue({ id: 'class-1' });
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin)
      .mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });

    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', token)
      .send({ classId: 'class-1', subjectId: 'subject-1', teacherId: 'admin-1' });

    expect(res.status).toBe(400);
  });

  it('rejects a section that belongs to a different class with 400', async () => {
    const token = signIn(superAdmin);
    prisma.schoolClass.findUnique.mockResolvedValue({ id: 'class-1' });
    prisma.subject.findUnique.mockResolvedValue({ id: 'subject-1' });
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin)
      .mockResolvedValue({ id: 'teacher-1', role: 'TEACHER' });
    prisma.section.findFirst.mockResolvedValue(null);

    const res = await request(app).post('/api/assignments').set('Authorization', token).send({
      classId: 'class-1',
      sectionId: 'section-elsewhere',
      subjectId: 'subject-1',
      teacherId: 'teacher-1',
    });

    expect(res.status).toBe(400);
  });
});

describe('class deletion guard', () => {
  beforeEach(() => reset());

  it('refuses to delete a class whose sections have students with 409', async () => {
    const token = signIn(superAdmin);
    prisma.section.findMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    prisma.student.count.mockResolvedValue(20);

    const res = await request(app).delete('/api/classes/class-1').set('Authorization', token);

    expect(res.status).toBe(409);
    expect(prisma.schoolClass.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty class', async () => {
    const token = signIn(superAdmin);
    prisma.section.findMany.mockResolvedValue([{ id: 's1' }]);
    prisma.student.count.mockResolvedValue(0);
    prisma.schoolClass.delete.mockResolvedValue({});

    const res = await request(app).delete('/api/classes/class-1').set('Authorization', token);

    expect(res.status).toBe(200);
  });
});
