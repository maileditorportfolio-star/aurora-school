/**
 * Grading helpers — SSC/HSC style GPA scale used by the school.
 *   80+ A+ 5.0 | 70+ A 4.0 | 60+ A- 3.5 | 50+ B 3.0
 *   40+ C 2.0  | 33+ D 1.0 | below F 0.0
 */

const GRADE_SCALE = [
  { min: 80, grade: 'A+', gpa: 5.0 },
  { min: 70, grade: 'A', gpa: 4.0 },
  { min: 60, grade: 'A-', gpa: 3.5 },
  { min: 50, grade: 'B', gpa: 3.0 },
  { min: 40, grade: 'C', gpa: 2.0 },
  { min: 33, grade: 'D', gpa: 1.0 },
  { min: 0, grade: 'F', gpa: 0.0 },
];

const gradeFor = (percentage) => {
  const pct = Number(percentage);
  if (Number.isNaN(pct)) return { grade: 'F', gpa: 0.0 };
  const band = GRADE_SCALE.find((entry) => pct >= entry.min) || GRADE_SCALE[GRADE_SCALE.length - 1];
  return { grade: band.grade, gpa: band.gpa };
};

/** Derive grade + gpa from a raw score. Absent (null) stays null. */
const gradeMark = (marksObtained, maxMarks) => {
  if (marksObtained === null || marksObtained === undefined) return { grade: null, gpa: null };
  const max = Number(maxMarks) || 100;
  const pct = (Number(marksObtained) / max) * 100;
  return gradeFor(pct);
};

/** Summarise a set of graded subjects into an overall GPA (F anywhere caps at 0 → counted as F). */
const summarize = (subjects) => {
  const graded = subjects.filter((s) => s.grade);
  if (graded.length === 0) return { gpa: null, grade: null, total: 0, failed: 0 };
  const failed = graded.filter((s) => s.grade === 'F').length;
  const gpa = failed > 0 ? 0 : graded.reduce((sum, s) => sum + (s.gpa || 0), 0) / graded.length;
  return {
    gpa: Math.round(gpa * 100) / 100,
    grade: failed > 0 ? 'F' : gradeFor((gpa / 5) * 100).grade,
    total: graded.length,
    failed,
  };
};

module.exports = { GRADE_SCALE, gradeFor, gradeMark, summarize };
