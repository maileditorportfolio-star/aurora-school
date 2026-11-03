const { z } = require('zod');
const { ALL_PERMISSIONS } = require('../permissions');

const API_PERMISSIONS = z.enum(ALL_PERMISSIONS);
const permissionList = z.array(API_PERMISSIONS).default([]);

const phone = z
  .string()
  .trim()
  .min(6, 'Enter a valid phone number')
  .max(24)
  .regex(/^[0-9+\-\s()]+$/, 'Enter a valid phone number');

const optionalUrl = z.string().trim().url().nullish().or(z.literal(''));

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.nullish(),
  avatarUrl: optionalUrl,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const adminUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  permissions: permissionList,
});

const adminUserUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  permissions: z.array(API_PERMISSIONS).optional(),
});

const academicYearSchema = z.object({
  name: z.string().trim().min(4).max(32),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.coerce.boolean().default(false),
});

const classSchema = z.object({
  name: z.string().trim().min(2).max(40),
  order: z.coerce.number().int().min(0).default(0),
});

const sectionSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  name: z.string().trim().min(1).max(8),
});

const subjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[A-Za-z0-9-]+$/, 'Code must be letters, numbers or dashes')
    .transform((value) => value.toUpperCase()),
});

const assignmentSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  sectionId: z.string().nullish(),
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
});

const studentSchema = z.object({
  admissionNo: z.string().trim().min(3).max(32).optional(),
  firstName: z.string().trim().min(2, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dateOfBirth: z.coerce.date().nullish(),
  bloodGroup: z.string().trim().max(4).nullish(),
  religion: z.string().trim().max(40).nullish(),
  address: z.string().trim().max(400).nullish(),
  photoUrl: optionalUrl,
  sectionId: z.string().nullish(),
  rollNumber: z.coerce.number().int().min(1).max(500).nullish(),
  status: z.enum(['ACTIVE', 'GRADUATED', 'TRANSFERRED', 'DROPPED']).optional(),
  guardian: z
    .object({
      name: z.string().trim().min(2).max(80),
      relation: z.string().trim().max(32).default('FATHER'),
      phone,
      email: z.string().trim().email().toLowerCase().nullish().or(z.literal('')),
      isPrimary: z.coerce.boolean().default(true),
    })
    .optional(),
});

const studentUpdateSchema = studentSchema.partial();

const staffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: phone.nullish(),
  employeeNo: z.string().trim().min(2).max(24).optional(),
  designation: z.string().trim().min(2).max(80).default('Teacher'),
  qualification: z.string().trim().max(120).nullish(),
  joiningDate: z.coerce.date().nullish(),
});

const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: phone.nullish(),
  designation: z.string().trim().min(2).max(80).optional(),
  qualification: z.string().trim().max(120).nullish(),
  joiningDate: z.coerce.date().nullish(),
});

const attendanceEntrySchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
  note: z.string().trim().max(200).optional(),
});

const attendanceMarkSchema = z.object({
  sectionId: z.string().min(1, 'Section is required'),
  date: z.coerce.date(),
  entries: z.array(attendanceEntrySchema).min(1, 'Add at least one student'),
});

const examSchema = z.object({
  name: z.string().trim().min(3).max(80),
  kind: z.enum(['CLASS_TEST', 'MID_TERM', 'FINAL', 'OTHER']).default('CLASS_TEST'),
  academicYearId: z.string().nullish(),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  subjects: z
    .array(
      z.object({
        subjectId: z.string().min(1),
        maxMarks: z.coerce.number().min(1).max(1000).default(100),
        passMarks: z.coerce.number().min(0).max(1000).default(33),
        examDate: z.coerce.date().nullish(),
      }),
    )
    .min(1, 'Add at least one subject'),
});

const marksEntrySchema = z.object({
  examSubjectId: z.string().min(1, 'Exam subject is required'),
  sectionId: z.string().min(1, 'Section is required'),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        marksObtained: z.coerce.number().min(0).nullable(),
        remarks: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, 'Add at least one student'),
});

const feeStructureSchema = z.object({
  name: z.string().trim().min(2).max(80),
  amount: z.coerce.number().min(0),
  frequency: z.enum(['MONTHLY', 'ANNUAL', 'ONE_TIME']).default('MONTHLY'),
  classId: z.string().nullish(),
  academicYearId: z.string().nullish(),
  dueDay: z.coerce.number().int().min(1).max(28).nullish(),
});

const invoiceGenerateSchema = z.object({
  structureId: z.string().min(1, 'Fee structure is required'),
  month: z.coerce.number().int().min(1).max(12).nullish(),
  year: z.coerce.number().int().min(2000).max(2200).nullish(),
  sectionId: z.string().nullish(),
  dueDate: z.coerce.date().optional(),
});

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  method: z.enum(['CASH', 'BKASH', 'NAGAD', 'CARD', 'BANK']).default('CASH'),
  reference: z.string().trim().max(80).optional(),
});

const timetableSlotSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  periodNo: z.coerce.number().int().min(1).max(12),
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24h HH:MM'),
  endTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24h HH:MM'),
  subjectId: z.string().nullish(),
  teacherId: z.string().nullish(),
  room: z.string().trim().max(32).nullish(),
  kind: z.enum(['CLASS', 'BREAK', 'ASSEMBLY']).default('CLASS'),
});

const timetableUpsertSchema = z.object({
  sectionId: z.string().min(1, 'Section is required'),
  slots: z.array(timetableSlotSchema).max(120),
});

const noticeSchema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(8000),
  audience: z.enum(['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF']).default('ALL'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  isPinned: z.coerce.boolean().default(false),
  expiresAt: z.coerce.date().nullish(),
});

const eventSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).nullish(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().nullish(),
  location: z.string().trim().max(160).nullish(),
  audience: z.enum(['ALL', 'STUDENTS', 'PARENTS', 'TEACHERS', 'STAFF']).default('ALL'),
});

const bookSchema = z.object({
  title: z.string().trim().min(2).max(200),
  author: z.string().trim().max(120).nullish(),
  isbn: z.string().trim().max(20).nullish(),
  category: z.string().trim().max(80).nullish(),
  publisher: z.string().trim().max(120).nullish(),
  totalCopies: z.coerce.number().int().min(1).default(1),
  shelfLocation: z.string().trim().max(40).nullish(),
});

const bookIssueSchema = z.object({
  bookId: z.string().min(1, 'Book is required'),
  studentId: z.string().min(1, 'Student is required'),
  dueDate: z.coerce.date(),
});

const bookReturnSchema = z.object({
  fineAmount: z.coerce.number().min(0).default(0),
});

const routeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(400).nullish(),
});

const stopSchema = z.object({
  routeId: z.string().min(1, 'Route is required'),
  name: z.string().trim().min(2).max(80),
  sequence: z.coerce.number().int().min(1).max(99),
  pickupTime: z.string().trim().max(16).nullish(),
  monthlyFee: z.coerce.number().min(0).default(0),
});

const vehicleSchema = z.object({
  routeId: z.string().nullish(),
  regNo: z.string().trim().min(4).max(24).toUpperCase(),
  model: z.string().trim().max(80).nullish(),
  capacity: z.coerce.number().int().min(1).max(120).default(40),
  driverName: z.string().trim().max(80).nullish(),
  driverPhone: phone.nullish(),
});

const transportAssignSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  routeId: z.string().min(1, 'Route is required'),
  stopId: z.string().nullish(),
  monthlyFee: z.coerce.number().min(0).default(0),
});

const messageSchema = z.object({
  conversationId: z.string().trim().max(64).default('support'),
  content: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

const schoolSettingSchema = z.object({
  schoolName: z.string().trim().min(2).max(120).optional(),
  tagline: z.string().trim().min(2).max(160).optional(),
  announcement: z.string().trim().min(1).max(200).optional(),
  heroDescription: z.string().trim().min(1).max(600).optional(),
  phone: z.string().trim().max(24).optional(),
  email: z.string().trim().email().toLowerCase().or(z.literal('')).optional(),
  address: z.string().trim().max(200).optional(),
  principal: z.string().trim().max(80).optional(),
  establishedYear: z.coerce.number().int().min(1800).max(2100).optional(),
});

/** Runs a zod schema and throws a 400 ApiError with field details on failure. */
const parse = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    const ApiError = require('../utils/ApiError');
    throw ApiError.badRequest(details[0]?.message || 'Invalid request', details);
  }
  return result.data;
};

module.exports = {
  loginSchema,
  profileSchema,
  changePasswordSchema,
  adminUserSchema,
  adminUserUpdateSchema,
  academicYearSchema,
  classSchema,
  sectionSchema,
  subjectSchema,
  assignmentSchema,
  studentSchema,
  studentUpdateSchema,
  staffSchema,
  staffUpdateSchema,
  attendanceMarkSchema,
  examSchema,
  marksEntrySchema,
  feeStructureSchema,
  invoiceGenerateSchema,
  paymentSchema,
  timetableUpsertSchema,
  noticeSchema,
  eventSchema,
  bookSchema,
  bookIssueSchema,
  bookReturnSchema,
  routeSchema,
  stopSchema,
  vehicleSchema,
  transportAssignSchema,
  messageSchema,
  schoolSettingSchema,
  parse,
};
