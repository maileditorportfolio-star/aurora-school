import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, student, parent, grade6A, studentRecord, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const sibling = {
  ...studentRecord,
  id: 'student-2',
  admissionNo: 'ADV-2026-0002',
  firstName: 'Trisha',
  gender: 'FEMALE',
};

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const studentScope = () => {
  prisma.student.findUnique.mockResolvedValueOnce(studentRecord).mockResolvedValue({
    ...studentRecord,
    section: grade6A,
  });
  prisma.student.findMany.mockResolvedValue([{ id: studentRecord.id }]);
};

const parentScope = () => {
  prisma.guardian.findMany.mockResolvedValue([
    { studentId: studentRecord.id },
    { studentId: sibling.id },
  ]);
};

describe('GET /api/portal/attendance', () => {
  beforeEach(() => reset());

  it('returns records and a rate for the linked student', async () => {
    const token = signIn(student);
    studentScope();
    prisma.attendance.findMany.mockResolvedValue([
      { id: 'a1', status: 'PRESENT', date: new Date('2026-11-02') },
      { id: 'a2', status: 'ABSENT', date: new Date('2026-11-01') },
    ]);

    const res = await request(app).get('/api/portal/attendance').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.records).toHaveLength(2);
    expect(res.body.data.rate).toBe(50);
  });

  it('scopes a parent to their own children only', async () => {
    const token = signIn(parent);
    parentScope();
    prisma.student.findUnique.mockResolvedValue({ ...sibling, section: grade6A });
    prisma.attendance.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/portal/attendance?studentId=student-2')
      .set('Authorization', token);

    expect(res.status).toBe(200);

    const forbidden = await request(app)
      .get('/api/portal/attendance?studentId=someone-elses-child')
      .set('Authorization', token);

    expect(forbidden.status).toBe(403);
  });
});

describe('GET /api/portal/results', () => {
  beforeEach(() => reset());

  it('returns only exams that have marks for this student', async () => {
    const token = signIn(student);
    studentScope();
    prisma.exam.findMany.mockResolvedValue([
      {
        id: 'exam-1',
        name: 'Half Yearly 2026',
        kind: 'MID_TERM',
        startDate: new Date('2026-08-15'),
        subjects: [
          {
            id: 'es-1',
            maxMarks: 100,
            passMarks: 33,
            subject: { id: 's1', name: 'Mathematics', code: 'MAT101' },
          },
        ],
      },
      {
        id: 'exam-2',
        name: 'Weekly Test',
        kind: 'CLASS_TEST',
        startDate: new Date('2026-09-10'),
        subjects: [
          {
            id: 'es-2',
            maxMarks: 100,
            passMarks: 33,
            subject: { id: 's2', name: 'Science', code: 'SCI101' },
          },
        ],
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

    const res = await request(app).get('/api/portal/results').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(1); // weekly test has no marks yet
    expect(res.body.data.results[0].exam.name).toBe('Half Yearly 2026');
    expect(res.body.data.results[0].rows[0].grade).toBe('A+');
  });
});

describe('GET /api/portal/timetable', () => {
  beforeEach(() => reset());

  it("returns the grid for the student's section", async () => {
    const token = signIn(student);
    studentScope();
    prisma.timetableSlot.findMany.mockResolvedValue([
      {
        id: 'slot-1',
        dayOfWeek: 0,
        periodNo: 1,
        kind: 'ASSEMBLY',
        startTime: '08:00',
        endTime: '08:30',
        subject: null,
      },
    ]);

    const res = await request(app).get('/api/portal/timetable').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.section.className).toBe('Grade 6');
    expect(res.body.data.slots).toHaveLength(1);
  });
});

describe('GET /api/portal/library', () => {
  beforeEach(() => reset());

  it('lists loans for the student', async () => {
    const token = signIn(student);
    studentScope();
    prisma.bookIssue.findMany.mockResolvedValue([
      {
        id: 'issue-1',
        status: 'ISSUED',
        dueDate: new Date('2026-11-20'),
        book: { id: 'b1', title: 'Sapiens' },
      },
    ]);

    const res = await request(app).get('/api/portal/library').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.issues).toHaveLength(1);
  });
});

describe('GET /api/portal/transport', () => {
  beforeEach(() => reset());

  it('returns the transport assignment with stops', async () => {
    const token = signIn(student);
    studentScope();
    prisma.studentTransport.findUnique.mockResolvedValue({
      id: 'transport-1',
      studentId: studentRecord.id,
      monthlyFee: 800,
      route: {
        id: 'route-1',
        name: 'Mirpur Route',
        stops: [
          { id: 'stop-1', name: 'Mirpur 10', sequence: 1, pickupTime: '07:00', monthlyFee: 800 },
        ],
        vehicles: [{ id: 'v1', regNo: 'DHAKA-GA-11-2345', capacity: 36 }],
      },
      stop: { id: 'stop-1', name: 'Mirpur 10' },
    });

    const res = await request(app).get('/api/portal/transport').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.transport.route.name).toBe('Mirpur Route');
    expect(res.body.data.transport.stop.name).toBe('Mirpur 10');
  });

  it('returns null when the student has no assignment', async () => {
    const token = signIn(student);
    studentScope();
    prisma.studentTransport.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/portal/transport').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.transport).toBeNull();
  });
});
