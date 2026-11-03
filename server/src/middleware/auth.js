const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const { normalizePermissions } = require('../permissions');
const { readToken, verifyToken } = require('../services/token.service');

const loadUser = async (req) => {
  const token = readToken(req);
  if (!token) return null;

  const payload = verifyToken(token);
  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      avatarUrl: true,
      phone: true,
    },
  });
};

/** Attaches `req.user` when a valid token is present, but never blocks the request. */
const optionalAuth = async (req, _res, next) => {
  try {
    req.user = await loadUser(req);
  } catch (error) {
    req.user = null;
  }
  next();
};

/** Rejects the request unless a valid token maps to an existing user. */
const requireAuth = async (req, _res, next) => {
  try {
    const user = await loadUser(req);
    if (!user) throw ApiError.unauthorized();
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const isStaff = (user) => user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
const isTeacher = (user) => user && user.role === 'TEACHER';
const isPortalUser = (user) => user && (user.role === 'STUDENT' || user.role === 'PARENT');

/** Restricts a route to staff accounts (ADMIN / SUPER_ADMIN). */
const requireAdmin = (req, _res, next) => {
  if (!isStaff(req.user)) {
    return next(ApiError.forbidden('Administrator access required'));
  }
  next();
};

/** Restricts a route to teachers only. */
const requireTeacher = (req, _res, next) => {
  if (!isTeacher(req.user)) {
    return next(ApiError.forbidden('Teacher access required'));
  }
  next();
};

/** Restricts a route to student/parent portal accounts. */
const requirePortal = (req, _res, next) => {
  if (!isPortalUser(req.user)) {
    return next(ApiError.forbidden('Portal access required'));
  }
  next();
};

/** Restricts a route to admins or teachers (shared workflows like attendance and marks). */
const requireStaffOrTeacher = (req, _res, next) => {
  if (!isStaff(req.user) && !isTeacher(req.user)) {
    return next(ApiError.forbidden('Staff or teacher access required'));
  }
  next();
};

/** Restricts a route to the super administrator. */
const requireSuperAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return next(ApiError.forbidden('Super administrator access required'));
  }
  next();
};

/** Restricts a staff route to one granular permission. Super admins bypass it. */
const requirePermission = (permission) => (req, _res, next) => {
  if (!isStaff(req.user)) {
    return next(ApiError.forbidden('Administrator access required'));
  }
  if (req.user.role === 'SUPER_ADMIN') return next();

  const granted = normalizePermissions(req.user.permissions);
  if (!granted.includes(permission)) {
    return next(ApiError.forbidden(`Missing permission: ${permission}`));
  }
  next();
};

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin,
  requireTeacher,
  requirePortal,
  requireStaffOrTeacher,
  requireSuperAdmin,
  requirePermission,
  isStaff,
  isTeacher,
  isPortalUser,
};
