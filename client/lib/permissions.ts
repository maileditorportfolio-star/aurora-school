export const PERMISSION_LABELS: Record<string, string> = {
  'students.write': 'Manage students & admissions',
  'staff.write': 'Manage teachers & staff',
  'classes.write': 'Manage classes, sections & subjects',
  'attendance.write': 'Mark & override attendance',
  'marks.write': 'Manage exams & enter marks',
  'fees.write': 'Manage fees, invoices & payments',
  'timetable.write': 'Edit class timetables',
  'notices.write': 'Publish notices & events',
  'library.write': 'Manage library & lending',
  'transport.write': 'Manage transport routes & vehicles',
  'analytics.read': 'View dashboard & analytics',
  'settings.write': 'Edit school profile & landing copy',
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);
