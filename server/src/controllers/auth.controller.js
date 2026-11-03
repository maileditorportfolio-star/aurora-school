const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../services/token.service');
const { normalizePermissions } = require('../permissions');
const {
  loginSchema,
  profileSchema,
  changePasswordSchema,
  parse,
} = require('../validation/schemas');

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone ?? null,
  role: user.role,
  permissions: normalizePermissions(user.permissions),
  avatarUrl: user.avatarUrl ?? null,
});

/** POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: { user: publicUser(user), token: signToken(user) },
  });
});

/** GET /api/auth/me */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
});

/** PATCH /api/auth/me */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl } = parse(profileSchema, req.body);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl || null } : {}),
    },
  });

  res.json({ success: true, data: { user: publicUser(user) } });
});

/** PATCH /api/auth/password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw ApiError.badRequest('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, env.security.bcryptRounds);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  res.json({ success: true, message: 'Password updated' });
});

module.exports = { login, me, updateProfile, changePassword, publicUser };
