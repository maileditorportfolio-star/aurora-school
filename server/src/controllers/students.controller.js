const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { studentSchema, studentUpdateSchema, parse } = require('../validation/schemas');

const studentInclude = {
  section: { include: { schoolClass: true } },
  guardians: true,
};

const mapStudent = (student) => ({
  ...student,
  section: student.section
    ? {
        id: student.section.id,
        name: student.section.name,
        class: student.section.schoolClass
          ? { id: student.section.schoolClass.id, name: student.section.schoolClass.name }
          : null,
      }
    : null,
});

const buildWhere = ({ search, sectionId, classId, status }) => {
  const where = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { admissionNo: { contains: search } },
    ];
  }
  if (sectionId) where.sectionId = sectionId;
  if (classId) where.section = { classId };
  if (status) where.status = status;
  return where;
};

/** GET /api/students?search=&sectionId=&classId=&status=&page=&limit= */
const list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const where = buildWhere(req.query);

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: studentInclude,
      orderBy: { admissionNo: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: {
      students: students.map(mapStudent),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/** GET /api/students/:id */
const detail = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      section: { include: { schoolClass: true } },
      guardians: true,
      transport: { include: { route: true, stop: true } },
      user: { select: { id: true, email: true } },
    },
  });
  if (!student) throw ApiError.notFound('Student not found');

  const attendance = await prisma.attendance.findMany({
    where: { studentId: student.id },
    orderBy: { date: 'desc' },
    take: 60,
  });
  const present = attendance.filter(
    (row) => row.status === 'PRESENT' || row.status === 'LATE',
  ).length;

  res.json({
    success: true,
    data: {
      student: mapStudent(student),
      attendance: {
        recent: attendance,
        rate: attendance.length ? Math.round((present / attendance.length) * 100) : null,
      },
    },
  });
});

const nextAdmissionNo = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.student.count();
  return `ADV-${year}-${String(count + 1).padStart(4, '0')}`;
};

/** POST /api/students */
const create = asyncHandler(async (req, res) => {
  const { guardian, ...data } = parse(studentSchema, req.body);
  if (!data.admissionNo) data.admissionNo = await nextAdmissionNo();

  if (data.sectionId && data.rollNumber != null) {
    const clash = await prisma.student.findFirst({
      where: { sectionId: data.sectionId, rollNumber: data.rollNumber },
    });
    if (clash) throw ApiError.conflict('That roll number is already used in this section');
  }

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({ data, include: studentInclude });
    if (guardian) {
      await tx.guardian.create({
        data: {
          studentId: created.id,
          name: guardian.name,
          relation: guardian.relation || 'GUARDIAN',
          phone: guardian.phone,
          email: guardian.email || null,
          isPrimary: guardian.isPrimary ?? true,
        },
      });
    }
    return tx.student.findUnique({ where: { id: created.id }, include: studentInclude });
  });

  res.status(201).json({ success: true, data: { student: mapStudent(student) } });
});

/** PATCH /api/students/:id */
const update = asyncHandler(async (req, res) => {
  const data = parse(studentUpdateSchema, req.body);
  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Student not found');

  if (data.sectionId !== undefined || data.rollNumber !== undefined) {
    const sectionId = data.sectionId === undefined ? existing.sectionId : data.sectionId;
    const rollNumber = data.rollNumber === undefined ? existing.rollNumber : data.rollNumber;
    if (sectionId && rollNumber != null) {
      const clash = await prisma.student.findFirst({
        where: { sectionId, rollNumber, NOT: { id: existing.id } },
      });
      if (clash) throw ApiError.conflict('That roll number is already used in this section');
    }
  }

  const student = await prisma.student.update({
    where: { id: existing.id },
    data,
    include: studentInclude,
  });

  res.json({ success: true, data: { student: mapStudent(student) } });
});

/** DELETE /api/students/:id — archive (soft delete). */
const archive = asyncHandler(async (req, res) => {
  const existing = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Student not found');

  const student = await prisma.student.update({
    where: { id: existing.id },
    data: { status: 'DROPPED' },
    include: studentInclude,
  });

  res.json({ success: true, data: { student: mapStudent(student) } });
});

/** POST /api/students/:id/account — create the student's portal login. */
const createAccount = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 8) {
    throw ApiError.badRequest('A password of 8+ characters is required');
  }

  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) throw ApiError.notFound('Student not found');
  if (student.userId) throw ApiError.conflict('This student already has a login');

  const email = String(
    req.body.email || `${student.admissionNo.toLowerCase()}@student.aurora.school`,
  )
    .trim()
    .toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('That email is already in use');

  const passwordHash = await bcrypt.hash(String(password), env.security.bcryptRounds);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: `${student.firstName} ${student.lastName}`,
      role: 'STUDENT',
    },
  });
  await prisma.student.update({ where: { id: student.id }, data: { userId: user.id } });

  res.status(201).json({ success: true, data: { email: user.email } });
});

/** POST /api/students/:studentId/guardians — add or replace a guardian. */
const addGuardian = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  if (!student) throw ApiError.notFound('Student not found');

  const { name, relation = 'GUARDIAN', phone, email, isPrimary = false } = req.body || {};
  if (!name || !phone) throw ApiError.badRequest('Guardian name and phone are required');

  const guardian = await prisma.guardian.create({
    data: {
      studentId: student.id,
      name: String(name).trim(),
      relation: String(relation).trim().toUpperCase() || 'GUARDIAN',
      phone: String(phone).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      isPrimary: Boolean(isPrimary),
    },
  });

  res.status(201).json({ success: true, data: { guardian } });
});

/** POST /api/guardians/:id/account — create the parent/guardian portal login. */
const createGuardianAccount = asyncHandler(async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 8) {
    throw ApiError.badRequest('A password of 8+ characters is required');
  }

  const guardian = await prisma.guardian.findUnique({ where: { id: req.params.id } });
  if (!guardian) throw ApiError.notFound('Guardian not found');
  if (guardian.userId) throw ApiError.conflict('This guardian already has a login');
  if (!guardian.email) throw ApiError.badRequest('Add an email for the guardian first');

  const existing = await prisma.user.findUnique({ where: { email: guardian.email } });
  if (existing) throw ApiError.conflict('That email is already in use');

  const passwordHash = await bcrypt.hash(String(password), env.security.bcryptRounds);
  const user = await prisma.user.create({
    data: {
      email: guardian.email,
      passwordHash,
      name: guardian.name,
      role: 'PARENT',
      phone: guardian.phone,
    },
  });
  await prisma.guardian.update({ where: { id: guardian.id }, data: { userId: user.id } });

  res.status(201).json({ success: true, data: { email: user.email } });
});

module.exports = {
  list,
  detail,
  create,
  update,
  archive,
  createAccount,
  addGuardian,
  createGuardianAccount,
};
