const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePermissions } = require('../permissions');
const { adminUserSchema, adminUserUpdateSchema, parse } = require('../validation/schemas');

const adminView = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: normalizePermissions(user.permissions),
  createdAt: user.createdAt,
});

/** GET /api/admin/users — staff accounts available to the super admin. */
const list = asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: { users: users.map(adminView) } });
});

/** POST /api/admin/users — create an admin with a custom permission set. */
const create = asyncHandler(async (req, res) => {
  const { name, email, password, permissions } = parse(adminUserSchema, req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, env.security.bcryptRounds);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'ADMIN',
      permissions: normalizePermissions(permissions),
    },
  });

  res.status(201).json({ success: true, data: { user: adminView(user) } });
});

/** PATCH /api/admin/users/:id — update an admin's name or permissions. */
const update = asyncHandler(async (req, res) => {
  const { name, permissions } = parse(adminUserUpdateSchema, req.body);
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!target) throw ApiError.notFound('Admin not found');
  if (target.role !== 'ADMIN') {
    throw ApiError.forbidden('Only standard admins can be edited');
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(name ? { name } : {}),
      ...(permissions ? { permissions: normalizePermissions(permissions) } : {}),
    },
  });

  res.json({ success: true, data: { user: adminView(user) } });
});

module.exports = { list, create, update };
