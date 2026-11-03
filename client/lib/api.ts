import type {
  AdminUser,
  AttendanceRow,
  AttendanceStatus,
  Book,
  BookIssue,
  ChatMessage,
  Exam,
  FeeInvoice,
  FeeStructure,
  GradebookResponse,
  Notice,
  Pagination,
  PortalOverview,
  ResultCard,
  Route,
  SchoolClass,
  SchoolEvent,
  SchoolSettings,
  StaffMember,
  Student,
  Subject,
  SubjectAssignment,
  TeacherOverview,
  TimetableSlot,
  TransportAssignment,
  User,
  Vehicle,
} from '@/types';

export interface AdminStats {
  totals: {
    students: number;
    staff: number;
    classes: number;
    sections: number;
    billed: number;
    collected: number;
    outstanding: number;
    presentToday: number;
    attendanceRate: number;
  };
  attendanceTrend: Array<{ date: string; present: number; total: number }>;
  collectionsByMonth: Array<{ month: string; collected: number }>;
  classStrength: Array<{ name: string; students: number }>;
  topDefaulters: Array<{ studentId: string; name: string; admissionNo: string; due: number }>;
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_URL;

export const TOKEN_KEY = 'aurora_school_token';

export class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    message: string,
    details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
};

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = false, headers, ...rest } = options;

  const token = auth ? getToken() : null;

  const response = await fetch(`${API_URL}/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message || `Request failed with status ${response.status}`,
      payload?.details,
    );
  }

  return payload?.data as T;
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = getToken();
  const form = new FormData();
  form.append('image', file);

  const response = await fetch(`${API_URL}/api${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message || `Upload failed with status ${response.status}`,
      payload?.details,
    );
  }

  return payload?.data as T;
}

const query = (params: Record<string, string | number | boolean | undefined | null>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
};

export const api = {
  auth: {
    login: (payload: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: payload }),
    me: () => request<{ user: User }>('/auth/me', { auth: true }),
    updateProfile: (payload: { name?: string; phone?: string | null; avatarUrl?: string | null }) =>
      request<{ user: User }>('/auth/me', { method: 'PATCH', body: payload, auth: true }),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean }>('/auth/password', {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
  },

  public: {
    settings: () => request<{ settings: SchoolSettings }>('/settings/public'),
    notices: () => request<{ notices: Notice[] }>('/notices/public'),
    events: () => request<{ events: SchoolEvent[] }>('/events/public'),
  },

  portal: {
    overview: () => request<PortalOverview>('/portal/overview', { auth: true }),
    attendance: (params: Record<string, string | undefined> = {}) =>
      request<{ rate: number | null; records: AttendanceRow[] }>(
        `/portal/attendance${query(params)}`,
        {
          auth: true,
        },
      ),
    results: (params: Record<string, string | undefined> = {}) =>
      request<{ results: ResultCard[] }>(`/portal/results${query(params)}`, { auth: true }),
    fees: (params: Record<string, string | undefined> = {}) =>
      request<{
        totals: { billed: number; paid: number; due: number };
        invoices: FeeInvoice[];
      }>(`/portal/fees${query(params)}`, { auth: true }),
    timetable: (params: Record<string, string | undefined> = {}) =>
      request<{
        section: { id: string; name: string; className: string | null } | null;
        slots: TimetableSlot[];
      }>(`/portal/timetable${query(params)}`, { auth: true }),
    notices: () => request<{ notices: Notice[] }>('/portal/notices', { auth: true }),
    library: (params: Record<string, string | undefined> = {}) =>
      request<{ issues: BookIssue[] }>(`/portal/library${query(params)}`, { auth: true }),
    transport: (params: Record<string, string | undefined> = {}) =>
      request<{ transport: import('@/types').StudentTransport | null }>(
        `/portal/transport${query(params)}`,
        {
          auth: true,
        },
      ),
  },

  teacher: {
    overview: () => request<TeacherOverview>('/teacher/overview', { auth: true }),
    sections: () =>
      request<{ sections: import('@/types').Section[] }>('/teacher/sections', { auth: true }),
    timetable: () => request<{ slots: TimetableSlot[] }>('/timetable/teacher', { auth: true }),
    notices: () => request<{ notices: Notice[] }>('/portal/notices', { auth: true }),
  },

  students: {
    list: (params: Record<string, string | number | undefined> = {}) =>
      request<{ students: Student[]; pagination: Pagination }>(`/students${query(params)}`, {
        auth: true,
      }),
    detail: (id: string) => request<{ student: Student }>(`/students/${id}`, { auth: true }),
    create: (payload: Record<string, unknown>) =>
      request<{ student: Student }>('/students', { method: 'POST', body: payload, auth: true }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<{ student: Student }>(`/students/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    archive: (id: string) =>
      request<{ student: Student }>(`/students/${id}`, { method: 'DELETE', auth: true }),
    createAccount: (id: string, payload: { password: string; email?: string }) =>
      request<{ email: string }>(`/students/${id}/account`, {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    addGuardian: (id: string, payload: Record<string, unknown>) =>
      request<{ guardian: import('@/types').Guardian }>(`/students/${id}/guardians`, {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    createGuardianAccount: (guardianId: string, payload: { password: string }) =>
      request<{ email: string }>(`/students/guardians/${guardianId}/account`, {
        method: 'POST',
        body: payload,
        auth: true,
      }),
  },

  staff: {
    list: (params: Record<string, string | undefined> = {}) =>
      request<{ staff: StaffMember[] }>(`/staff${query(params)}`, { auth: true }),
    create: (payload: Record<string, unknown>) =>
      request<{ staff: StaffMember }>('/staff', { method: 'POST', body: payload, auth: true }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<{ staff: StaffMember }>(`/staff/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    remove: (id: string) =>
      request<{ id: string }>(`/staff/${id}`, { method: 'DELETE', auth: true }),
  },

  classes: {
    tree: () => request<{ classes: SchoolClass[] }>('/classes', { auth: true }),
    create: (payload: { name: string; order?: number }) =>
      request<{ schoolClass: SchoolClass }>('/classes', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    update: (id: string, payload: { name?: string; order?: number }) =>
      request<{ schoolClass: SchoolClass }>(`/classes/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    remove: (id: string) =>
      request<{ id: string }>(`/classes/${id}`, { method: 'DELETE', auth: true }),
    addSection: (payload: { classId: string; name: string }) =>
      request<{ section: SchoolClass['sections'][number] }>('/sections', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    removeSection: (id: string) =>
      request<{ id: string }>(`/sections/${id}`, { method: 'DELETE', auth: true }),
    subjects: () => request<{ subjects: Subject[] }>('/subjects', { auth: true }),
    createSubject: (payload: { name: string; code: string }) =>
      request<{ subject: Subject }>('/subjects', { method: 'POST', body: payload, auth: true }),
    updateSubject: (id: string, payload: { name?: string; code?: string }) =>
      request<{ subject: Subject }>(`/subjects/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    removeSubject: (id: string) =>
      request<{ id: string }>(`/subjects/${id}`, { method: 'DELETE', auth: true }),
    addClassSubject: (classId: string, subjectId: string) =>
      request<{ classSubject: unknown }>(`/classes/${classId}/subjects`, {
        method: 'POST',
        body: { subjectId },
        auth: true,
      }),
    removeClassSubject: (classId: string, subjectId: string) =>
      request<{ classId: string; subjectId: string }>(`/classes/${classId}/subjects/${subjectId}`, {
        method: 'DELETE',
        auth: true,
      }),
    assignments: (params: Record<string, string | undefined> = {}) =>
      request<{ assignments: SubjectAssignment[] }>(`/assignments${query(params)}`, { auth: true }),
    createAssignment: (payload: Record<string, unknown>) =>
      request<{ assignment: SubjectAssignment }>('/assignments', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    removeAssignment: (id: string) =>
      request<{ id: string }>(`/assignments/${id}`, { method: 'DELETE', auth: true }),
    academicYears: () =>
      request<{ academicYears: Array<{ id: string; name: string; isCurrent: boolean }> }>(
        '/academic-years',
        { auth: true },
      ),
  },

  attendance: {
    bySection: (sectionId: string, date?: string) =>
      request<{
        section: { id: string; name: string; className: string };
        date: string;
        students: Array<{
          id: string;
          rollNumber?: number | null;
          firstName: string;
          lastName: string;
          admissionNo: string;
          status: AttendanceStatus | null;
        }>;
      }>(`/attendance${query({ sectionId, date })}`, { auth: true }),
    summary: (params: Record<string, string | undefined>) =>
      request<{
        from: string;
        to: string;
        students: Array<{
          id: string;
          rollNumber?: number | null;
          firstName: string;
          lastName: string;
          PRESENT: number;
          ABSENT: number;
          LATE: number;
          EXCUSED: number;
          total: number;
          rate: number | null;
        }>;
      }>(`/attendance/summary${query(params)}`, { auth: true }),
    mark: (payload: {
      sectionId: string;
      date: string;
      entries: Array<{ studentId: string; status: AttendanceStatus; note?: string }>;
    }) =>
      request<{ marked: number }>('/attendance/mark', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
  },

  exams: {
    list: () => request<{ exams: Exam[] }>('/exams', { auth: true }),
    detail: (id: string) => request<{ exam: Exam }>(`/exams/${id}`, { auth: true }),
    create: (payload: Record<string, unknown>) =>
      request<{ exam: Exam }>('/exams', { method: 'POST', body: payload, auth: true }),
    remove: (id: string) =>
      request<{ id: string }>(`/exams/${id}`, { method: 'DELETE', auth: true }),
    enterMarks: (payload: {
      examSubjectId: string;
      sectionId: string;
      entries: Array<{ studentId: string; marksObtained: number | null; remarks?: string }>;
    }) => request<{ saved: number }>('/exams/marks', { method: 'POST', body: payload, auth: true }),
    gradebook: (examId: string, sectionId: string) =>
      request<GradebookResponse>(`/exams/marks/gradebook${query({ examId, sectionId })}`, {
        auth: true,
      }),
  },

  fees: {
    structures: () => request<{ structures: FeeStructure[] }>('/fees/structures', { auth: true }),
    createStructure: (payload: Record<string, unknown>) =>
      request<{ structure: FeeStructure }>('/fees/structures', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    updateStructure: (id: string, payload: Record<string, unknown>) =>
      request<{ structure: FeeStructure }>(`/fees/structures/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    removeStructure: (id: string) =>
      request<{ id: string }>(`/fees/structures/${id}`, { method: 'DELETE', auth: true }),
    invoices: (params: Record<string, string | number | undefined> = {}) =>
      request<{ invoices: FeeInvoice[]; pagination: Pagination }>(
        `/fees/invoices${query(params)}`,
        { auth: true },
      ),
    createInvoice: (payload: Record<string, unknown>) =>
      request<{ invoice: FeeInvoice }>('/fees/invoices', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    generateInvoices: (payload: Record<string, unknown>) =>
      request<{ created: number; skipped: number; total: number }>('/fees/invoices/generate', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    addPayment: (
      invoiceId: string,
      payload: { amount: number; method: string; reference?: string },
    ) =>
      request<{ invoice: FeeInvoice }>(`/fees/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    waiveInvoice: (invoiceId: string) =>
      request<{ invoice: FeeInvoice }>(`/fees/invoices/${invoiceId}/waive`, {
        method: 'POST',
        auth: true,
      }),
    removeInvoice: (invoiceId: string) =>
      request<{ id: string }>(`/fees/invoices/${invoiceId}`, { method: 'DELETE', auth: true }),
    studentSummary: (studentId: string) =>
      request<{
        totals: { billed: number; paid: number; due: number; open: number };
        invoices: FeeInvoice[];
      }>(`/fees/students/${studentId}/summary`, { auth: true }),
  },

  timetable: {
    bySection: (sectionId: string) =>
      request<{ section: { id: string; name: string; className: string }; slots: TimetableSlot[] }>(
        `/timetable${query({ sectionId })}`,
        { auth: true },
      ),
    replaceSlots: (payload: {
      sectionId: string;
      slots: Array<Omit<TimetableSlot, 'id' | 'subject'>>;
    }) =>
      request<{ slots: TimetableSlot[] }>('/timetable/slots', {
        method: 'PUT',
        body: payload,
        auth: true,
      }),
  },

  noticesAdmin: {
    list: () => request<{ notices: Notice[] }>('/notices', { auth: true }),
    create: (payload: Record<string, unknown>) =>
      request<{ notice: Notice }>('/notices', { method: 'POST', body: payload, auth: true }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<{ notice: Notice }>(`/notices/${id}`, { method: 'PATCH', body: payload, auth: true }),
    remove: (id: string) =>
      request<{ id: string }>(`/notices/${id}`, { method: 'DELETE', auth: true }),
  },

  eventsAdmin: {
    list: () => request<{ events: SchoolEvent[] }>('/events', { auth: true }),
    create: (payload: Record<string, unknown>) =>
      request<{ event: SchoolEvent }>('/events', { method: 'POST', body: payload, auth: true }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<{ event: SchoolEvent }>(`/events/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    remove: (id: string) =>
      request<{ id: string }>(`/events/${id}`, { method: 'DELETE', auth: true }),
  },

  library: {
    books: (params: Record<string, string | undefined> = {}) =>
      request<{ books: Book[] }>(`/library/books${query(params)}`, { auth: true }),
    createBook: (payload: Record<string, unknown>) =>
      request<{ book: Book }>('/library/books', { method: 'POST', body: payload, auth: true }),
    updateBook: (id: string, payload: Record<string, unknown>) =>
      request<{ book: Book }>(`/library/books/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    removeBook: (id: string) =>
      request<{ id: string }>(`/library/books/${id}`, { method: 'DELETE', auth: true }),
    issues: (params: Record<string, string | undefined> = {}) =>
      request<{ issues: BookIssue[] }>(`/library/issues${query(params)}`, { auth: true }),
    issue: (payload: { bookId: string; studentId: string; dueDate: string }) =>
      request<{ issue: BookIssue }>('/library/issues', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    return: (id: string, payload: { fineAmount: number }) =>
      request<{ issue: BookIssue }>(`/library/issues/${id}/return`, {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    lost: (id: string) =>
      request<{ issue: BookIssue }>(`/library/issues/${id}/lost`, { method: 'POST', auth: true }),
  },

  transport: {
    routes: () => request<{ routes: Route[] }>('/transport/routes', { auth: true }),
    createRoute: (payload: Record<string, unknown>) =>
      request<{ route: Route }>('/transport/routes', { method: 'POST', body: payload, auth: true }),
    updateRoute: (id: string, payload: Record<string, unknown>) =>
      request<{ route: Route }>(`/transport/routes/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    removeRoute: (id: string) =>
      request<{ id: string }>(`/transport/routes/${id}`, { method: 'DELETE', auth: true }),
    addStop: (payload: Record<string, unknown>) =>
      request<{ stop: import('@/types').RouteStop }>('/transport/stops', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    removeStop: (id: string) =>
      request<{ id: string }>(`/transport/stops/${id}`, { method: 'DELETE', auth: true }),
    vehicles: () => request<{ vehicles: Vehicle[] }>('/transport/vehicles', { auth: true }),
    createVehicle: (payload: Record<string, unknown>) =>
      request<{ vehicle: Vehicle }>('/transport/vehicles', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    updateVehicle: (id: string, payload: Record<string, unknown>) =>
      request<{ vehicle: Vehicle }>(`/transport/vehicles/${id}`, {
        method: 'PATCH',
        body: payload,
        auth: true,
      }),
    removeVehicle: (id: string) =>
      request<{ id: string }>(`/transport/vehicles/${id}`, { method: 'DELETE', auth: true }),
    assignments: (params: Record<string, string | undefined> = {}) =>
      request<{ assignments: TransportAssignment[] }>(`/transport/assignments${query(params)}`, {
        auth: true,
      }),
    assign: (payload: Record<string, unknown>) =>
      request<{ assignment: TransportAssignment }>('/transport/assignments', {
        method: 'POST',
        body: payload,
        auth: true,
      }),
    unassign: (studentId: string) =>
      request<{ studentId: string }>(`/transport/assignments/${studentId}`, {
        method: 'DELETE',
        auth: true,
      }),
  },

  admin: {
    stats: () => request<AdminStats>('/admin/stats', { auth: true }),
    settings: {
      get: () => request<{ settings: SchoolSettings }>('/admin/settings', { auth: true }),
      update: (payload: Partial<SchoolSettings>) =>
        request<{ settings: SchoolSettings }>('/admin/settings', {
          method: 'PATCH',
          body: payload,
          auth: true,
        }),
    },
    team: {
      list: () => request<{ users: AdminUser[] }>('/admin/users', { auth: true }),
      permissions: () =>
        request<{ permissions: string[] }>('/admin/users/permissions', { auth: true }),
      create: (payload: { name: string; email: string; password: string; permissions: string[] }) =>
        request<{ user: AdminUser }>('/admin/users', { method: 'POST', body: payload, auth: true }),
      update: (id: string, payload: { name?: string; permissions?: string[] }) =>
        request<{ user: AdminUser }>(`/admin/users/${id}`, {
          method: 'PATCH',
          body: payload,
          auth: true,
        }),
    },
    uploadImage: (file: File) => uploadFile<{ url: string }>('/admin/uploads/image', file),
  },

  chat: {
    history: (conversationId: string) =>
      request<{ messages: ChatMessage[] }>(`/chat/${conversationId}`),
    send: (payload: { conversationId: string; content: string }) =>
      request<{ message: ChatMessage }>('/chat', { method: 'POST', body: payload, auth: true }),
  },
};

export default api;
