const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isStaff } = require('../middleware/auth');
const { examSchema, marksEntrySchema, parse } = require('../validation/schemas');
const { gradeMark, summarize } = require('../services/grade.service');

/** Teachers may enter marks only for subjects assigned to them in the section's class. */
const assertTeacherMarksAccess = async (user, examSubject, section) => {
  if (isStaff(user)) return;
  const assignment = await prisma.subjectAssignment.findFirst({
    where: {
      teacherId: user.id,
      subjectId: examSubject.subjectId,
      classId: section.classId,
      OR: [{ sectionId: section.id }, { sectionId: null }],
    },
  });
  if (!assignment)
    throw ApiError.forbidden('You are not assigned to teach this subject in this section');
};

/** GET /api/exams */
const list = asyncHandler(async (_req, res) => {
  const exams = await prisma.exam.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      academicYear: true,
      subjects: { include: { subject: true } },
      _count: { select: { subjects: true } },
    },
  });

  res.json({ success: true, data: { exams } });
});

/** GET /api/exams/:id */
const detail = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findUnique({
    where: { id: req.params.id },
    include: {
      academicYear: true,
      subjects: { include: { subject: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!exam) throw ApiError.notFound('Exam not found');

  res.json({ success: true, data: { exam } });
});

/** POST /api/exams */
const create = asyncHandler(async (req, res) => {
  const { subjects, ...data } = parse(examSchema, req.body);

  const exam = await prisma.exam.create({
    data: {
      ...data,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      subjects: {
        create: subjects.map((subject) => ({
          subjectId: subject.subjectId,
          maxMarks: subject.maxMarks,
          passMarks: subject.passMarks,
          examDate: subject.examDate || null,
        })),
      },
    },
    include: { subjects: { include: { subject: true } }, academicYear: true },
  });

  res.status(201).json({ success: true, data: { exam } });
});

/** DELETE /api/exams/:id */
const remove = asyncHandler(async (req, res) => {
  const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
  if (!exam) throw ApiError.notFound('Exam not found');

  await prisma.exam.delete({ where: { id: exam.id } });
  res.json({ success: true, data: { id: exam.id } });
});

/** POST /api/marks — bulk entry for one exam subject in one section. */
const enterMarks = asyncHandler(async (req, res) => {
  const { examSubjectId, sectionId, entries } = parse(marksEntrySchema, req.body);

  const [examSubject, section] = await Promise.all([
    prisma.examSubject.findUnique({ where: { id: examSubjectId }, include: { exam: true } }),
    prisma.section.findUnique({ where: { id: sectionId } }),
  ]);
  if (!examSubject) throw ApiError.notFound('Exam subject not found');
  if (!section) throw ApiError.notFound('Section not found');
  await assertTeacherMarksAccess(req.user, examSubject, section);

  const students = await prisma.student.findMany({
    where: { sectionId: section.id },
    select: { id: true },
  });
  const sectionIds = new Set(students.map((s) => s.id));

  const prepared = entries.map((entry) => {
    if (!sectionIds.has(entry.studentId)) {
      throw ApiError.badRequest('Some entries reference students outside this section');
    }
    if (entry.marksObtained !== null && entry.marksObtained > examSubject.maxMarks) {
      throw ApiError.badRequest(`Marks cannot exceed ${examSubject.maxMarks}`);
    }
    const { grade, gpa } = gradeMark(entry.marksObtained, examSubject.maxMarks);
    return {
      studentId: entry.studentId,
      marksObtained: entry.marksObtained,
      grade,
      gpa,
      remarks: entry.remarks || null,
    };
  });

  await prisma.$transaction(
    prepared.map((entry) =>
      prisma.mark.upsert({
        where: { examSubjectId_studentId: { examSubjectId, studentId: entry.studentId } },
        create: { examSubjectId, ...entry },
        update: entry,
      }),
    ),
  );

  res.json({ success: true, data: { examSubjectId, sectionId, saved: prepared.length } });
});

/** GET /api/marks/gradebook?examId=&sectionId= */
const gradebook = asyncHandler(async (req, res) => {
  const { examId, sectionId } = req.query;
  if (!examId || !sectionId) throw ApiError.badRequest('examId and sectionId are required');

  const [exam, section] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: String(examId) },
      include: { subjects: { include: { subject: true } } },
    }),
    prisma.section.findUnique({ where: { id: String(sectionId) }, include: { schoolClass: true } }),
  ]);
  if (!exam) throw ApiError.notFound('Exam not found');
  if (!section) throw ApiError.notFound('Section not found');

  const students = await prisma.student.findMany({
    where: { sectionId: section.id },
    orderBy: [{ rollNumber: 'asc' }, { firstName: 'asc' }],
  });

  const examSubjectIds = exam.subjects.map((row) => row.id);
  const marks = await prisma.mark.findMany({
    where: { examSubjectId: { in: examSubjectIds }, studentId: { in: students.map((s) => s.id) } },
  });
  const markByKey = new Map(marks.map((mark) => [`${mark.examSubjectId}:${mark.studentId}`, mark]));

  res.json({
    success: true,
    data: {
      exam: { id: exam.id, name: exam.name, kind: exam.kind },
      section: { id: section.id, name: section.name, className: section.schoolClass.name },
      subjects: exam.subjects.map((row) => ({
        id: row.id,
        maxMarks: row.maxMarks,
        passMarks: row.passMarks,
        subject: { id: row.subject.id, name: row.subject.name, code: row.subject.code },
      })),
      students: students.map((student) => {
        const perSubject = {};
        const graded = [];
        exam.subjects.forEach((row) => {
          const mark = markByKey.get(`${row.id}:${student.id}`);
          perSubject[row.id] = mark
            ? { marksObtained: mark.marksObtained, grade: mark.grade, gpa: mark.gpa }
            : null;
          if (mark?.grade) graded.push({ grade: mark.grade, gpa: mark.gpa });
        });
        const summary = summarize(graded);
        return {
          id: student.id,
          rollNumber: student.rollNumber,
          admissionNo: student.admissionNo,
          firstName: student.firstName,
          lastName: student.lastName,
          marks: perSubject,
          summary,
        };
      }),
    },
  });
});

module.exports = { list, detail, create, remove, enterMarks, gradebook };
