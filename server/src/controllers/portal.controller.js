const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { summarize } = require('../services/grade.service');

/** Resolve the student ids the caller may see (own profile, or children for parents). */
const portalStudentIds = async (user) => {
  if (user.role === 'STUDENT') {
    const student = await prisma.student.findUnique({ where: { userId: user.id } });
    return student ? [student.id] : [];
  }
  const guardians = await prisma.guardian.findMany({
    where: { userId: user.id },
    select: { studentId: true },
  });
  return guardians.map((guardian) => guardian.studentId);
};

/** Pick one student within the caller's scope (defaults to the first). */
const resolveStudent = async (user, requestedId) => {
  const allowed = await portalStudentIds(user);
  if (allowed.length === 0) throw ApiError.notFound('No student profile is linked to this account');
  const id = requestedId && allowed.includes(requestedId) ? requestedId : allowed[0];
  if (requestedId && !allowed.includes(requestedId)) {
    throw ApiError.forbidden('You do not have access to that student');
  }
  const student = await prisma.student.findUnique({
    where: { id },
    include: { section: { include: { schoolClass: true } }, guardians: true },
  });
  return student;
};

const attendanceRateFor = async (studentId) => {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await prisma.attendance.findMany({ where: { studentId, date: { gte: since } } });
  if (rows.length === 0) return null;
  const good = rows.filter((row) => row.status === 'PRESENT' || row.status === 'LATE').length;
  return Math.round((good / rows.length) * 100);
};

/** GET /api/portal/overview?studentId= — dashboard composite for the portal home. */
const overview = asyncHandler(async (req, res) => {
  const allowed = await portalStudentIds(req.user);
  if (allowed.length === 0) throw ApiError.notFound('No student profile is linked to this account');

  const students = await prisma.student.findMany({
    where: { id: { in: allowed } },
    include: { section: { include: { schoolClass: true } } },
  });

  const children = await Promise.all(
    students.map(async (student) => {
      const [attendanceRate, invoices, upcomingExams, recentMarks] = await Promise.all([
        attendanceRateFor(student.id),
        prisma.feeInvoice.findMany({ where: { studentId: student.id } }),
        prisma.exam.findMany({
          where: { startDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
          take: 3,
        }),
        prisma.mark.findMany({
          where: { studentId: student.id },
          include: { examSubject: { include: { exam: true, subject: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

      const due = invoices
        .filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED')
        .reduce((sum, row) => sum + (row.amount - row.paidAmount), 0);

      return {
        id: student.id,
        admissionNo: student.admissionNo,
        firstName: student.firstName,
        lastName: student.lastName,
        rollNumber: student.rollNumber,
        className: student.section?.schoolClass?.name ?? null,
        sectionName: student.section?.name ?? null,
        status: student.status,
        attendanceRate,
        fees: {
          due,
          open: invoices.filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED').length,
        },
        upcomingExams,
        recentResults: recentMarks.map((mark) => ({
          exam: mark.examSubject.exam.name,
          subject: mark.examSubject.subject.name,
          marksObtained: mark.marksObtained,
          maxMarks: mark.examSubject.maxMarks,
          grade: mark.grade,
        })),
      };
    }),
  );

  res.json({ success: true, data: { students: children } });
});

/** GET /api/portal/attendance?studentId=&from=&to= */
const attendance = asyncHandler(async (req, res) => {
  const student = await resolveStudent(req.user, req.query.studentId);
  const where = { studentId: student.id };
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date.gte = new Date(req.query.from);
    if (req.query.to) where.date.lte = new Date(req.query.to);
  }

  const rows = await prisma.attendance.findMany({ where, orderBy: { date: 'desc' }, take: 400 });
  const present = rows.filter((row) => row.status === 'PRESENT' || row.status === 'LATE').length;

  res.json({
    success: true,
    data: {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      rate: rows.length ? Math.round((present / rows.length) * 100) : null,
      records: rows,
    },
  });
});

/** GET /api/portal/results?studentId= — full result cards for every exam. */
const results = asyncHandler(async (req, res) => {
  const student = await resolveStudent(req.user, req.query.studentId);

  const exams = await prisma.exam.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: { subjects: { include: { subject: true } } },
  });
  const marks = await prisma.mark.findMany({
    where: { studentId: student.id },
  });
  const markBySubject = new Map(marks.map((mark) => [mark.examSubjectId, mark]));

  const cards = exams
    .map((exam) => {
      const rows = exam.subjects.map((examSubject) => {
        const mark = markBySubject.get(examSubject.id);
        return {
          subject: examSubject.subject.name,
          maxMarks: examSubject.maxMarks,
          passMarks: examSubject.passMarks,
          marksObtained: mark?.marksObtained ?? null,
          grade: mark?.grade ?? null,
          gpa: mark?.gpa ?? null,
        };
      });
      const graded = rows.filter((row) => row.grade);
      const summary = summarize(graded);
      return {
        exam: { id: exam.id, name: exam.name, kind: exam.kind, startDate: exam.startDate },
        rows,
        summary,
      };
    })
    .filter((card) => card.rows.some((row) => row.marksObtained !== null));

  res.json({
    success: true,
    data: {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      results: cards,
    },
  });
});

/** GET /api/portal/fees?studentId= */
const fees = asyncHandler(async (req, res) => {
  const student = await resolveStudent(req.user, req.query.studentId);

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId: student.id },
    include: { payments: { orderBy: { createdAt: 'desc' } } },
    orderBy: { dueDate: 'desc' },
  });

  const withFlags = invoices.map((invoice) => ({
    ...invoice,
    isOverdue:
      invoice.status !== 'PAID' &&
      invoice.status !== 'WAIVED' &&
      new Date(invoice.dueDate) < new Date(),
  }));
  const billed = invoices.reduce((sum, row) => sum + row.amount, 0);
  const paid = invoices.reduce((sum, row) => sum + row.paidAmount, 0);

  res.json({
    success: true,
    data: {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNo: student.admissionNo,
      },
      totals: { billed, paid, due: billed - paid },
      invoices: withFlags,
    },
  });
});

/** GET /api/portal/timetable?studentId= */
const timetable = asyncHandler(async (req, res) => {
  const student = await resolveStudent(req.user, req.query.studentId);
  if (!student.sectionId) return res.json({ success: true, data: { slots: [], section: null } });

  const slots = await prisma.timetableSlot.findMany({
    where: { sectionId: student.sectionId },
    include: { subject: true },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
  });

  res.json({
    success: true,
    data: {
      section: {
        id: student.section.id,
        name: student.section.name,
        className: student.section.schoolClass?.name ?? null,
      },
      slots,
    },
  });
});

/** GET /api/portal/notices — notices visible to this portal user. */
const notices = asyncHandler(async (req, res) => {
  const now = new Date();
  const audiences =
    req.user.role === 'STUDENT'
      ? ['ALL', 'STUDENTS']
      : req.user.role === 'PARENT'
        ? ['ALL', 'PARENTS']
        : ['ALL', 'TEACHERS', 'STAFF'];

  const rows = await prisma.notice.findMany({
    where: {
      audience: { in: audiences },
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: 30,
  });

  res.json({ success: true, data: { notices: rows } });
});

/** GET /api/portal/library?studentId= */
const library = asyncHandler(async (req, res) => {
  const student = await resolveStudent(req.user, req.query.studentId);

  const issues = await prisma.bookIssue.findMany({
    where: { studentId: student.id },
    include: { book: true },
    orderBy: { issueDate: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: { issues } });
});

/** GET /api/portal/transport?studentId= */
const transport = asyncHandler(async (req, res) => {
  const student = await resolveStudent(req.user, req.query.studentId);

  const assignment = await prisma.studentTransport.findUnique({
    where: { studentId: student.id },
    include: {
      route: { include: { stops: { orderBy: { sequence: 'asc' } }, vehicles: true } },
      stop: true,
    },
  });

  res.json({ success: true, data: { transport: assignment } });
});

module.exports = { overview, attendance, results, fees, timetable, notices, library, transport };
