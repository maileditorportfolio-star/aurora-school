const PERMISSIONS = {
  STUDENTS_WRITE: 'students.write',
  STAFF_WRITE: 'staff.write',
  CLASSES_WRITE: 'classes.write',
  ATTENDANCE_WRITE: 'attendance.write',
  MARKS_WRITE: 'marks.write',
  FEES_WRITE: 'fees.write',
  TIMETABLE_WRITE: 'timetable.write',
  NOTICES_WRITE: 'notices.write',
  LIBRARY_WRITE: 'library.write',
  TRANSPORT_WRITE: 'transport.write',
  ANALYTICS_READ: 'analytics.read',
  SETTINGS_WRITE: 'settings.write',
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

/** Keeps only known permission keys and removes duplicates. */
const normalizePermissions = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((permission) => ALL_PERMISSIONS.includes(permission)))];
};

module.exports = { PERMISSIONS, ALL_PERMISSIONS, normalizePermissions };
