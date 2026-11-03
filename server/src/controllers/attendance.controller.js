const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isStaff } = require('../middleware/auth');
const { attendanceMarkSchema, parse } = require('../validation/schemas');

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Teachers may only mark sections they are assigned to (class-wide or section-specific). */
const assertTeacherSectionAccess = async (user, section) => {
  if (isStaff(user)) return;
  const assignment = await prisma.subjectAssignment.findFirst({
    where: {
      teacherId: user.id,
      classId: section.classId,
      OR: [{ sectionId: section.id }, { sectionId: null }],
    },
  });
  if (!assignment) throw ApiError.forbidden('You are not assigned to this section');
};

/** POST /api/attendance/mark */
const mark = asyncHandler(async (req, res) => {
  const { sectionId, date, entries } = parse(attendanceMarkSchema, req.body);

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  await assertTeacherSectionAccess(req.user, section);

  const day = startOfDay(date);
  const studentIds = entries.map((entry) => entry.studentId);
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true },
  });
  const validIds = new Set(students.map((s) => s.id));
  const invalid = studentIds.filter((id) => !validIds.has(id));
  if (invalid.length) throw ApiError.badRequest('Some entries reference unknown students');

  await prisma.$transaction(
    entries.map((entry) =>
      prisma.attendance.upsert({
        where: { studentId_date: { studentId: entry.studentId, date: day } },
        create: {
          studentId: entry.studentId,
          date: day,
          status: entry.status,
          note: entry.note || null,
          markedById: req.user?.id || null,
        },
        update: {
          status: entry.status,
          note: entry.note || null,
          markedById: req.user?.id || null,
        },
      }),
    ),
  );

  res.json({ success: true, data: { sectionId, date: day, marked: entries.length } });
});

/** GET /api/attendance?sectionId=&date= */
const bySection = asyncHandler(async (req, res) => {
  const { sectionId } = req.query;
  if (!sectionId) throw ApiError.badRequest('sectionId is required');
  const day = startOfDay(req.query.date || new Date());

  const section = await prisma.section.findUnique({
    where: { id: String(sectionId) },
    include: { schoolClass: true },
  });
  if (!section) throw ApiError.notFound('Section not found');

  const [students, rows] = await Promise.all([
    prisma.student.findMany({
      where: { sectionId: section.id, status: 'ACTIVE' },
      orderBy: [{ rollNumber: 'asc' }, { firstName: 'asc' }],
    }),
    prisma.attendance.findMany({ where: { date: day, student: { sectionId: section.id } } }),
  ]);
  const statusByStudent = new Map(rows.map((row) => [row.studentId, row]));

  res.json({
    success: true,
    data: {
      section: { id: section.id, name: section.name, className: section.schoolClass.name },
      date: day,
      students: students.map((student) => ({
        id: student.id,
        rollNumber: student.rollNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNo: student.admissionNo,
        status: statusByStudent.get(student.id)?.status || null,
      })),
    },
  });
});

/** GET /api/attendance/summary?sectionId=&from=&to= */
const summary = asyncHandler(async (req, res) => {
  const { sectionId } = req.query;
  if (!sectionId) throw ApiError.badRequest('sectionId is required');

  const to = startOfDay(req.query.to || new Date());
  const from = req.query.from
    ? startOfDay(req.query.from)
    : startOfDay(new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000));

  const students = await prisma.student.findMany({
    where: { sectionId: String(sectionId), status: 'ACTIVE' },
    orderBy: [{ rollNumber: 'asc' }],
  });
  const rows = await prisma.attendance.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, date: { gte: from, lte: to } },
  });

  const byStudent = new Map();
  rows.forEach((row) => {
    if (!byStudent.has(row.studentId))
      byStudent.set(row.studentId, { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, total: 0 });
    const bucket = byStudent.get(row.studentId);
    bucket[row.status] += 1;
    bucket.total += 1;
  });

  res.json({
    success: true,
    data: {
      from,
      to,
      students: students.map((student) => {
        const counts = byStudent.get(student.id) || {
          PRESENT: 0,
          ABSENT: 0,
          LATE: 0,
          EXCUSED: 0,
          total: 0,
        };
        const rate = counts.total
          ? Math.round(((counts.PRESENT + counts.LATE) / counts.total) * 100)
          : null;
        return {
          id: student.id,
          rollNumber: student.rollNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          ...counts,
          rate,
        };
      }),
    },
  });
});

module.exports = { mark, bySection, summary };
