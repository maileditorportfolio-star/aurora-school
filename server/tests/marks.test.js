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
import { nodeRequire } from './helpers/prisma-mock.js';

const { app, prisma, reset } = setupApp();
const { GRADE_SCALE } = nodeRequire('../../src/services/grade.service.js');

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const examSubject = {
  id: 'exam-subject-1',
  examId: 'exam-1',
  subjectId: 'subject-math',
  maxMarks: 100,
  passMarks: 33,
  exam: { id: 'exam-1', name: 'Half Yearly 2026' },
};

describe('grade scale', () => {
  it('awards A+ at 80 and F below 33', () => {
    expect(GRADE_SCALE[0]).toEqual({ min: 80, grade: 'A+', gpa: 5.0 });
    expect(GRADE_SCALE[GRADE_SCALE.length - 1]).toEqual({ min: 0, grade: 'F', gpa: 0.0 });
  });
});

describe('POST /api/exams/marks', () => {
  beforeEach(() => reset());

  const payload = {
    examSubjectId: examSubject.id,
    sectionId: grade6A.id,
    entries: [
      { studentId: studentRecord.id, marksObtained: 87 },
      { studentId: 'student-2', marksObtained: 31 },
      { studentId: 'student-3', marksObtained: null },
    ],
  };

  it('stores marks with derived grade and gpa for staff', async () => {
    const token = signIn(superAdmin);
    prisma.examSubject.findUnique.mockResolvedValue(examSubject);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([
      { id: studentRecord.id },
      { id: 'student-2' },
      { id: 'student-3' },
    ]);
    prisma.mark.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/exams/marks')
      .set('Authorization', token)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data.saved).toBe(3);
    expect(prisma.mark.upsert).toHaveBeenCalledTimes(3);

    const first = prisma.mark.upsert.mock.calls[0][0];
    expect(first.create.grade).toBe('A+');
    expect(first.create.gpa).toBe(5.0);

    const second = prisma.mark.upsert.mock.calls[1][0];
    expect(second.create.grade).toBe('F');
    expect(second.create.gpa).toBe(0.0);

    const third = prisma.mark.upsert.mock.calls[2][0];
    expect(third.create.grade).toBeNull(); // absent
  });

  it('lets a teacher enter marks for an assigned subject', async () => {
    const token = signIn(teacher);
    prisma.examSubject.findUnique.mockResolvedValue(examSubject);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.subjectAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' });
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]);
    prisma.mark.upsert.mockResolvedValue({});

    const res = await request(app)
      .post('/api/exams/marks')
      .set('Authorization', token)
      .send({ ...payload, entries: [{ studentId: studentRecord.id, marksObtained: 75 }] });

    expect(res.status).toBe(200);
  });

  it('rejects a teacher entering marks for an unassigned subject', async () => {
    const token = signIn(teacher);
    prisma.examSubject.findUnique.mockResolvedValue(examSubject);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.subjectAssignment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/exams/marks')
      .set('Authorization', token)
      .send({ ...payload, entries: [{ studentId: studentRecord.id, marksObtained: 75 }] });

    expect(res.status).toBe(403);
    expect(prisma.mark.upsert).not.toHaveBeenCalled();
  });

  it('rejects marks above the maximum with 400', async () => {
    const token = signIn(superAdmin);
    prisma.examSubject.findUnique.mockResolvedValue(examSubject);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]);

    const res = await request(app)
      .post('/api/exams/marks')
      .set('Authorization', token)
      .send({ ...payload, entries: [{ studentId: studentRecord.id, marksObtained: 101 }] });

    expect(res.status).toBe(400);
    expect(prisma.mark.upsert).not.toHaveBeenCalled();
  });

  it('rejects students outside the section with 400', async () => {
    const token = signIn(superAdmin);
    prisma.examSubject.findUnique.mockResolvedValue(examSubject);
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]);

    const res = await request(app)
      .post('/api/exams/marks')
      .set('Authorization', token)
      .send({ ...payload, entries: [{ studentId: 'student-2', marksObtained: 50 }] });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/exams/marks/gradebook', () => {
  beforeEach(() => reset());

  it('returns the matrix with summary GPA per student', async () => {
    const token = signIn(superAdmin);
    prisma.exam.findUnique.mockResolvedValue({
      id: 'exam-1',
      name: 'Half Yearly 2026',
      kind: 'MID_TERM',
      subjects: [
        {
          id: 'es-1',
          maxMarks: 100,
          passMarks: 33,
          subject: { id: 'subject-math', name: 'Mathematics', code: 'MAT101' },
        },
      ],
    });
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([
      {
        id: studentRecord.id,
        rollNumber: 1,
        admissionNo: 'ADV-2026-0001',
        firstName: 'Naim',
        lastName: 'Khan',
      },
    ]);
    prisma.mark.findMany.mockResolvedValue([
      {
        examSubjectId: 'es-1',
        studentId: studentRecord.id,
        marksObtained: 87,
        grade: 'A+',
        gpa: 5.0,
      },
    ]);

    const res = await request(app)
      .get(`/api/exams/marks/gradebook?examId=exam-1&sectionId=${grade6A.id}`)
      .set('Authorization', token);

    expect(res.status).toBe(200);
    const studentRow = res.body.data.students[0];
    expect(studentRow.marks['es-1'].grade).toBe('A+');
    expect(studentRow.summary.gpa).toBe(5.0);
    expect(studentRow.summary.failed).toBe(0);
  });

  it('caps the GPA at zero when the student fails any subject', async () => {
    const token = signIn(superAdmin);
    prisma.exam.findUnique.mockResolvedValue({
      id: 'exam-1',
      name: 'Half Yearly 2026',
      kind: 'MID_TERM',
      subjects: [
        {
          id: 'es-1',
          maxMarks: 100,
          passMarks: 33,
          subject: { id: 'subject-math', name: 'Mathematics', code: 'MAT101' },
        },
      ],
    });
    prisma.section.findUnique.mockResolvedValue(grade6A);
    prisma.student.findMany.mockResolvedValue([
      {
        id: studentRecord.id,
        rollNumber: 1,
        admissionNo: 'ADV-2026-0001',
        firstName: 'Naim',
        lastName: 'Khan',
      },
    ]);
    prisma.mark.findMany.mockResolvedValue([
      {
        examSubjectId: 'es-1',
        studentId: studentRecord.id,
        marksObtained: 20,
        grade: 'F',
        gpa: 0.0,
      },
    ]);

    const res = await request(app)
      .get(`/api/exams/marks/gradebook?examId=exam-1&sectionId=${grade6A.id}`)
      .set('Authorization', token);

    expect(res.body.data.students[0].summary.gpa).toBe(0.0);
    expect(res.body.data.students[0].summary.failed).toBe(1);
  });

  it('requires examId and sectionId', async () => {
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/exams/marks/gradebook').set('Authorization', token);

    expect(res.status).toBe(400);
  });
});

describe('exam management permissions', () => {
  beforeEach(() => reset());

  it('allows super admins to create exams', async () => {
    const token = signIn(superAdmin);
    prisma.exam.create.mockResolvedValue({ id: 'exam-1', subjects: [] });

    const res = await request(app)
      .post('/api/exams')
      .set('Authorization', token)
      .send({ name: 'Weekly Test', kind: 'CLASS_TEST', subjects: [{ subjectId: 'subject-math' }] });

    expect(res.status).toBe(201);
  });

  it('rejects a cashier creating exams (marks.write required)', async () => {
    const token = signIn(restrictedAdmin);

    const res = await request(app)
      .post('/api/exams')
      .set('Authorization', token)
      .send({ name: 'Weekly Test', kind: 'CLASS_TEST', subjects: [{ subjectId: 'subject-math' }] });

    expect(res.status).toBe(403);
    expect(prisma.exam.create).not.toHaveBeenCalled();
  });
});
