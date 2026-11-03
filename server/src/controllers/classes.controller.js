const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  academicYearSchema,
  classSchema,
  sectionSchema,
  subjectSchema,
  assignmentSchema,
  parse,
} = require('../validation/schemas');

/** GET /api/classes — class tree with sections and subjects. */
const tree = asyncHandler(async (_req, res) => {
  const classes = await prisma.schoolClass.findMany({
    orderBy: { order: 'asc' },
    include: {
      sections: { orderBy: { name: 'asc' }, include: { _count: { select: { students: true } } } },
      classSubjects: { include: { subject: true } },
    },
  });

  res.json({
    success: true,
    data: {
      classes: classes.map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        order: schoolClass.order,
        sections: schoolClass.sections.map((section) => ({
          id: section.id,
          name: section.name,
          studentCount: section._count.students,
        })),
        subjects: schoolClass.classSubjects.map((row) => row.subject),
      })),
    },
  });
});

/** POST /api/classes */
const createClass = asyncHandler(async (req, res) => {
  const data = parse(classSchema, req.body);
  const existing = await prisma.schoolClass.findUnique({ where: { name: data.name } });
  if (existing) throw ApiError.conflict('That class already exists');

  const schoolClass = await prisma.schoolClass.create({ data });
  res.status(201).json({ success: true, data: { schoolClass } });
});

/** PATCH /api/classes/:id */
const updateClass = asyncHandler(async (req, res) => {
  const data = parse(classSchema.partial(), req.body);
  const schoolClass = await prisma.schoolClass.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { schoolClass } });
});

/** DELETE /api/classes/:id */
const removeClass = asyncHandler(async (req, res) => {
  const sections = await prisma.section.findMany({
    where: { classId: req.params.id },
    select: { id: true },
  });
  const students = await prisma.student.count({
    where: { sectionId: { in: sections.map((s) => s.id) } },
  });
  if (students > 0) throw ApiError.conflict('Move or archive the students in this class first');

  await prisma.schoolClass.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

/** POST /api/sections */
const createSection = asyncHandler(async (req, res) => {
  const data = parse(sectionSchema, req.body);
  const schoolClass = await prisma.schoolClass.findUnique({ where: { id: data.classId } });
  if (!schoolClass) throw ApiError.notFound('Class not found');

  const existing = await prisma.section.findUnique({
    where: { classId_name: { classId: data.classId, name: data.name.toUpperCase() } },
  });
  if (existing) throw ApiError.conflict('That section already exists in this class');

  const section = await prisma.section.create({
    data: { classId: data.classId, name: data.name.toUpperCase() },
  });
  res.status(201).json({ success: true, data: { section } });
});

/** DELETE /api/sections/:id */
const removeSection = asyncHandler(async (req, res) => {
  const students = await prisma.student.count({ where: { sectionId: req.params.id } });
  if (students > 0) throw ApiError.conflict('Move or archive the students in this section first');

  await prisma.section.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

/** GET /api/subjects */
const listSubjects = asyncHandler(async (_req, res) => {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } });
  res.json({ success: true, data: { subjects } });
});

/** POST /api/subjects */
const createSubject = asyncHandler(async (req, res) => {
  const data = parse(subjectSchema, req.body);
  const existing = await prisma.subject.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict('That subject code already exists');

  const subject = await prisma.subject.create({ data });
  res.status(201).json({ success: true, data: { subject } });
});

/** PATCH /api/subjects/:id */
const updateSubject = asyncHandler(async (req, res) => {
  const data = parse(subjectSchema.partial(), req.body);
  const subject = await prisma.subject.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: { subject } });
});

/** DELETE /api/subjects/:id */
const removeSubject = asyncHandler(async (req, res) => {
  await prisma.subject.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

/** POST /api/classes/:classId/subjects */
const addClassSubject = asyncHandler(async (req, res) => {
  const subjectId = String(req.body?.subjectId || '');
  if (!subjectId) throw ApiError.badRequest('Subject is required');

  const [schoolClass, subject] = await Promise.all([
    prisma.schoolClass.findUnique({ where: { id: req.params.classId } }),
    prisma.subject.findUnique({ where: { id: subjectId } }),
  ]);
  if (!schoolClass) throw ApiError.notFound('Class not found');
  if (!subject) throw ApiError.notFound('Subject not found');

  const row = await prisma.classSubject.upsert({
    where: { classId_subjectId: { classId: schoolClass.id, subjectId } },
    create: { classId: schoolClass.id, subjectId },
    update: {},
    include: { subject: true },
  });

  res.status(201).json({ success: true, data: { classSubject: row } });
});

/** DELETE /api/classes/:classId/subjects/:subjectId */
const removeClassSubject = asyncHandler(async (req, res) => {
  await prisma.classSubject.delete({
    where: { classId_subjectId: { classId: req.params.classId, subjectId: req.params.subjectId } },
  });
  res.json({
    success: true,
    data: { classId: req.params.classId, subjectId: req.params.subjectId },
  });
});

/** GET /api/assignments?classId=&sectionId=&teacherId= */
const listAssignments = asyncHandler(async (req, res) => {
  const { classId, sectionId, teacherId } = req.query;
  const assignments = await prisma.subjectAssignment.findMany({
    where: {
      ...(classId ? { classId: String(classId) } : {}),
      ...(sectionId ? { sectionId: String(sectionId) } : {}),
      ...(teacherId ? { teacherId: String(teacherId) } : {}),
    },
    include: {
      schoolClass: true,
      section: true,
      subject: true,
      teacher: { select: { id: true, name: true, email: true } },
    },
  });

  res.json({ success: true, data: { assignments } });
});

/** POST /api/assignments */
const createAssignment = asyncHandler(async (req, res) => {
  const data = parse(assignmentSchema, req.body);

  const [schoolClass, subject, teacher] = await Promise.all([
    prisma.schoolClass.findUnique({ where: { id: data.classId } }),
    prisma.subject.findUnique({ where: { id: data.subjectId } }),
    prisma.user.findUnique({ where: { id: data.teacherId } }),
  ]);
  if (!schoolClass) throw ApiError.notFound('Class not found');
  if (!subject) throw ApiError.notFound('Subject not found');
  if (!teacher || teacher.role !== 'TEACHER')
    throw ApiError.badRequest('Assignments can target teachers only');

  if (data.sectionId) {
    const section = await prisma.section.findFirst({
      where: { id: data.sectionId, classId: data.classId },
    });
    if (!section) throw ApiError.badRequest('That section does not belong to this class');
  }

  const include = {
    schoolClass: true,
    section: true,
    subject: true,
    teacher: { select: { id: true, name: true, email: true } },
  };

  const existing = await prisma.subjectAssignment.findFirst({
    where: { classId: data.classId, sectionId: data.sectionId || null, subjectId: data.subjectId },
  });

  const assignment = existing
    ? await prisma.subjectAssignment.update({
        where: { id: existing.id },
        data: { teacherId: data.teacherId },
        include,
      })
    : await prisma.subjectAssignment.create({
        data: {
          classId: data.classId,
          sectionId: data.sectionId || null,
          subjectId: data.subjectId,
          teacherId: data.teacherId,
        },
        include,
      });

  res.status(201).json({ success: true, data: { assignment } });
});

/** DELETE /api/assignments/:id */
const removeAssignment = asyncHandler(async (req, res) => {
  await prisma.subjectAssignment.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

/** GET /api/academic-years */
const listAcademicYears = asyncHandler(async (_req, res) => {
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: 'desc' },
  });
  res.json({ success: true, data: { academicYears } });
});

/** POST /api/academic-years */
const createAcademicYear = asyncHandler(async (req, res) => {
  const data = parse(academicYearSchema, req.body);
  if (data.endDate <= data.startDate)
    throw ApiError.badRequest('End date must be after the start date');

  const academicYear = await prisma.$transaction(async (tx) => {
    if (data.isCurrent) await tx.academicYear.updateMany({ data: { isCurrent: false } });
    return tx.academicYear.create({ data });
  });

  res.status(201).json({ success: true, data: { academicYear } });
});

module.exports = {
  tree,
  createClass,
  updateClass,
  removeClass,
  createSection,
  removeSection,
  listSubjects,
  createSubject,
  updateSubject,
  removeSubject,
  addClassSubject,
  removeClassSubject,
  listAssignments,
  createAssignment,
  removeAssignment,
  listAcademicYears,
  createAcademicYear,
};
