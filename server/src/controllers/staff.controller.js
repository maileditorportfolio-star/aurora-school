const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { staffSchema, staffUpdateSchema, parse } = require('../validation/schemas');

const staffSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  createdAt: true,
  staffProfile: true,
};

const mapStaff = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
  profile: user.staffProfile
    ? {
        employeeNo: user.staffProfile.employeeNo,
        designation: user.staffProfile.designation,
        qualification: user.staffProfile.qualification,
        joiningDate: user.staffProfile.joiningDate,
      }
    : null,
});

const nextEmployeeNo = async () => {
  const count = await prisma.staffProfile.count();
  return `EMP-${String(count + 1).padStart(4, '0')}`;
};

/** GET /api/staff?search= */
const list = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const users = await prisma.user.findMany({
    where: {
      role: 'TEACHER',
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { staffProfile: { employeeNo: { contains: search } } },
            ],
          }
        : {}),
    },
    select: staffSelect,
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: { staff: users.map(mapStaff) } });
});

/** POST /api/staff */
const create = asyncHandler(async (req, res) => {
  const data = parse(staffSchema, req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const employeeNo = data.employeeNo || (await nextEmployeeNo());
  const employeeClash = await prisma.staffProfile.findUnique({ where: { employeeNo } });
  if (employeeClash) throw ApiError.conflict('That employee number is already in use');

  const passwordHash = await bcrypt.hash(data.password, env.security.bcryptRounds);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone || null,
        role: 'TEACHER',
      },
    });
    await tx.staffProfile.create({
      data: {
        userId: created.id,
        employeeNo,
        designation: data.designation,
        qualification: data.qualification || null,
        joiningDate: data.joiningDate || null,
      },
    });
    return tx.user.findUnique({ where: { id: created.id }, select: staffSelect });
  });

  res.status(201).json({ success: true, data: { staff: mapStaff(user) } });
});

/** PATCH /api/staff/:id */
const update = asyncHandler(async (req, res) => {
  const data = parse(staffUpdateSchema, req.body);
  const target = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { staffProfile: true },
  });
  if (!target || target.role !== 'TEACHER') throw ApiError.notFound('Staff member not found');

  const user = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      },
    });
    if (target.staffProfile) {
      await tx.staffProfile.update({
        where: { userId: target.id },
        data: {
          ...(data.designation ? { designation: data.designation } : {}),
          ...(data.qualification !== undefined
            ? { qualification: data.qualification || null }
            : {}),
          ...(data.joiningDate !== undefined ? { joiningDate: data.joiningDate || null } : {}),
        },
      });
    }
    return tx.user.findUnique({ where: { id: target.id }, select: staffSelect });
  });

  res.json({ success: true, data: { staff: mapStaff(user) } });
});

/** DELETE /api/staff/:id — remove the account and profile. */
const remove = asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role !== 'TEACHER') throw ApiError.notFound('Staff member not found');

  await prisma.user.delete({ where: { id: target.id } });

  res.json({ success: true, data: { id: target.id } });
});

module.exports = { list, create, update, remove, mapStaff };
