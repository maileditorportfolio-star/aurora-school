export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  permissions: string[];
  avatarUrl?: string | null;
}

export interface AdminUser extends User {
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ClassSection {
  id: string;
  name: string;
  studentCount?: number;
}

export interface SchoolClass {
  id: string;
  name: string;
  order: number;
  sections: ClassSection[];
  subjects: Subject[];
}

export interface Section {
  id: string;
  name: string;
  classId?: string;
  className?: string | null;
  schoolClass?: { id: string; name: string } | null;
  _count?: { students: number };
}

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Guardian {
  id: string;
  studentId: string;
  userId?: string | null;
  name: string;
  relation: string;
  phone: string;
  email?: string | null;
  isPrimary: boolean;
}

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  religion?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  admissionDate: string;
  status: 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'DROPPED';
  rollNumber?: number | null;
  sectionId?: string | null;
  section?: {
    id: string;
    name: string;
    class?: { id: string; name: string } | null;
  } | null;
  guardians?: Guardian[];
  transport?: StudentTransport | null;
}

export interface StaffProfile {
  employeeNo: string;
  designation: string;
  qualification?: string | null;
  joiningDate?: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  profile: StaffProfile | null;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRow {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  note?: string | null;
}

export type ExamKind = 'CLASS_TEST' | 'MID_TERM' | 'FINAL' | 'OTHER';

export interface ExamSubject {
  id: string;
  examId: string;
  subjectId: string;
  maxMarks: number;
  passMarks: number;
  examDate?: string | null;
  subject?: Subject;
}

export interface Exam {
  id: string;
  name: string;
  kind: ExamKind;
  startDate?: string | null;
  endDate?: string | null;
  academicYear?: { id: string; name: string } | null;
  subjects: ExamSubject[];
}

export interface GradebookSubject {
  id: string;
  maxMarks: number;
  passMarks: number;
  subject: Subject;
}

export interface GradebookStudent {
  id: string;
  rollNumber?: number | null;
  admissionNo: string;
  firstName: string;
  lastName: string;
  marks: Record<
    string,
    { marksObtained: number | null; grade: string | null; gpa: number | null } | null
  >;
  summary: { gpa: number | null; grade: string | null; total: number; failed: number };
}

export interface GradebookResponse {
  exam: { id: string; name: string; kind: ExamKind };
  section: { id: string; name: string; className: string };
  subjects: GradebookSubject[];
  students: GradebookStudent[];
}

export type FeeFrequency = 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
export type InvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'WAIVED';
export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'CARD' | 'BANK';

export interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  frequency: FeeFrequency;
  classId?: string | null;
  academicYearId?: string | null;
  dueDay?: number | null;
  schoolClass?: { id: string; name: string } | null;
  _count?: { invoices: number };
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  createdAt: string;
  receivedBy?: { name: string } | null;
}

export interface FeeInvoice {
  id: string;
  invoiceNo: string;
  studentId: string;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  month?: number | null;
  year?: number | null;
  status: InvoiceStatus;
  isOverdue?: boolean;
  student?: Student;
  structure?: FeeStructure | null;
  payments?: Payment[];
}

export type SlotKind = 'CLASS' | 'BREAK' | 'ASSEMBLY';

export interface TimetableSlot {
  id?: string;
  dayOfWeek: number;
  periodNo: number;
  startTime: string;
  endTime: string;
  kind: SlotKind;
  room?: string | null;
  subjectId?: string | null;
  subject?: Subject | null;
  teacherId?: string | null;
  teacherName?: string | null;
  section?: { id: string; name: string; className: string | null } | null;
}

export type NoticeAudience = 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
export type NoticePriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export interface Notice {
  id: string;
  title: string;
  body: string;
  audience: NoticeAudience;
  priority: NoticePriority;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string | null;
  author?: { id: string; name: string } | null;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt?: string | null;
  location?: string | null;
  audience: NoticeAudience;
}

export interface Book {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  category?: string | null;
  publisher?: string | null;
  totalCopies: number;
  availableCopies: number;
  shelfLocation?: string | null;
}

export type BookIssueStatus = 'ISSUED' | 'RETURNED' | 'OVERDUE' | 'LOST';

export interface BookIssue {
  id: string;
  bookId: string;
  studentId?: string | null;
  issueDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: BookIssueStatus;
  fineAmount: number;
  isOverdue?: boolean;
  book: Book;
  student?: { id: string; firstName: string; lastName: string; admissionNo: string } | null;
}

export interface RouteStop {
  id: string;
  routeId: string;
  name: string;
  sequence: number;
  pickupTime?: string | null;
  monthlyFee: number;
}

export interface Vehicle {
  id: string;
  routeId?: string | null;
  regNo: string;
  model?: string | null;
  capacity: number;
  driverName?: string | null;
  driverPhone?: string | null;
  route?: Route | null;
}

export interface Route {
  id: string;
  name: string;
  description?: string | null;
  stops: RouteStop[];
  vehicles: Vehicle[];
  _count?: { assignments: number };
}

export interface StudentTransport {
  id: string;
  studentId: string;
  routeId: string;
  stopId?: string | null;
  monthlyFee: number;
  startDate: string;
  active: boolean;
  route?: Route | null;
  stop?: RouteStop | null;
}

export interface TransportAssignment {
  id: string;
  monthlyFee: number;
  startDate: string;
  active: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNo: string;
    rollNumber?: number | null;
  };
  route: Route;
  stop?: RouteStop | null;
}

export interface SubjectAssignment {
  id: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teacherId: string;
  schoolClass?: { id: string; name: string };
  section?: { id: string; name: string } | null;
  subject?: Subject;
  teacher?: { id: string; name: string; email: string };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  sender: 'USER' | 'ADMIN' | 'SYSTEM';
  createdAt: string;
  user?: { id: string; name: string; avatarUrl?: string | null; role?: Role } | null;
}

export interface SchoolSettings {
  id: string;
  schoolName: string;
  tagline: string;
  announcement: string;
  heroDescription: string;
  phone: string;
  email: string;
  address: string;
  principal: string;
  establishedYear: number;
}

export interface TeacherOverview {
  assignments: SubjectAssignment[];
  sections: Section[];
  todaySlots: TimetableSlot[];
  date: string;
}

export interface PortalChild {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  rollNumber?: number | null;
  className: string | null;
  sectionName: string | null;
  status: Student['status'];
  attendanceRate: number | null;
  fees: { due: number; open: number };
  upcomingExams: Array<{ id: string; name: string; kind: ExamKind; startDate?: string | null }>;
  recentResults: Array<{
    exam: string;
    subject: string;
    marksObtained: number | null;
    maxMarks: number;
    grade: string | null;
  }>;
}

export interface PortalOverview {
  students: PortalChild[];
}

export interface ResultCard {
  exam: { id: string; name: string; kind: ExamKind; startDate?: string | null };
  rows: Array<{
    subject: string;
    maxMarks: number;
    passMarks: number;
    marksObtained: number | null;
    grade: string | null;
    gpa: number | null;
  }>;
  summary: { gpa: number | null; grade: string | null; total: number; failed: number };
}
