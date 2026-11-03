import { createRequire } from 'node:module';
import { createPrismaMock, installPrismaMock, resetPrisma } from './prisma-mock.js';

const nodeRequire = createRequire(import.meta.url);

/**
 * Boots the Express app with the Prisma client replaced by a mock.
 * Environment variables are set before the app is required so the config
 * module picks up test-friendly values.
 */
export const setupApp = () => {
  process.env.NODE_ENV = 'test';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.AUTH_RATE_LIMIT = '1000';
  process.env.JWT_SECRET = 'test-secret-aurora-school';

  const prisma = installPrismaMock(createPrismaMock());
  resetPrisma(prisma);

  const app = nodeRequire('../../src/app.js');

  return { app, prisma, reset: () => resetPrisma(prisma) };
};

/** Signs a real JWT for the given user so auth guards can be exercised end to end. */
export const tokenFor = (user) => {
  const { signToken } = nodeRequire('../../src/services/token.service.js');
  return `Bearer ${signToken(user)}`;
};

export const superAdmin = {
  id: 'user-super-admin',
  name: 'Super Admin',
  email: 'admin@aurora.school',
  phone: '+8801700000000',
  role: 'SUPER_ADMIN',
  permissions: [],
  avatarUrl: null,
};

export const admin = {
  id: 'user-admin',
  name: 'Office Admin',
  email: 'office@aurora.school',
  phone: '+8801700000001',
  role: 'ADMIN',
  permissions: ['students.write', 'attendance.write', 'fees.write'],
  avatarUrl: null,
};

export const restrictedAdmin = {
  id: 'user-restricted',
  name: 'Fee Cashier',
  email: 'cashier@aurora.school',
  phone: '+8801700000002',
  role: 'ADMIN',
  permissions: ['fees.write'],
  avatarUrl: null,
};

export const teacher = {
  id: 'user-teacher',
  name: 'Arif Hossain',
  email: 'arif@aurora.school',
  phone: '+8801700000003',
  role: 'TEACHER',
  permissions: [],
  avatarUrl: null,
};

export const student = {
  id: 'user-student',
  name: 'Naim Khan',
  email: 'student@aurora.school',
  phone: null,
  role: 'STUDENT',
  permissions: [],
  avatarUrl: null,
};

export const parent = {
  id: 'user-parent',
  name: 'Demo Parent',
  email: 'parent@aurora.school',
  phone: '+8801700000004',
  role: 'PARENT',
  permissions: [],
  avatarUrl: null,
};

export const grade6A = {
  id: 'section-6a',
  name: 'A',
  classId: 'class-grade-6',
  schoolClass: { id: 'class-grade-6', name: 'Grade 6', order: 6 },
};

export const studentRecord = {
  id: 'student-1',
  admissionNo: 'ADV-2026-0001',
  firstName: 'Naim',
  lastName: 'Khan',
  gender: 'MALE',
  dateOfBirth: new Date('2013-03-13'),
  bloodGroup: 'B+',
  religion: 'Islam',
  address: 'House 11, Road 4, Dhaka',
  photoUrl: null,
  admissionDate: new Date('2026-01-05'),
  status: 'ACTIVE',
  rollNumber: 1,
  sectionId: grade6A.id,
  userId: null,
};

export const staffProfile = {
  id: 'profile-1',
  userId: teacher.id,
  employeeNo: 'EMP-0002',
  designation: 'Senior Teacher',
  qualification: 'M.Sc Mathematics, DU',
  joiningDate: new Date('2022-01-15'),
};
