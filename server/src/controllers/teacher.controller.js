const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** GET /api/teacher/overview — assignment grid plus today's schedule. */
const overview = asyncHandler(async (req, res) => {
  const today = startOfDay(new Date());
  const dayOfWeek = today.getDay();

  const [assignments, todaySlots] = await Promise.all([
    prisma.subjectAssignment.findMany({
      where: { teacherId: req.user.id },
      include: {
        schoolClass: true,
        section: true,
        subject: true,
      },
    }),
    prisma.timetableSlot.findMany({
      where: { teacherId: req.user.id, dayOfWeek },
      include: { subject: true, section: { include: { schoolClass: true } } },
      orderBy: { periodNo: 'asc' },
    }),
  ]);

  const direct = [...new Set(assignments.map((row) => row.sectionId).filter(Boolean))];
  const classWide = [
    ...new Set(assignments.filter((row) => !row.sectionId).map((row) => row.classId)),
  ];

  const sections = await prisma.section.findMany({
    where: {
      OR: [{ id: { in: direct } }, { classId: { in: classWide } }],
    },
    include: { schoolClass: true, _count: { select: { students: true } } },
    orderBy: [{ classId: 'asc' }, { name: 'asc' }],
  });

  res.json({
    success: true,
    data: {
      assignments,
      sections,
      todaySlots,
      date: today,
    },
  });
});

/** GET /api/teacher/sections — distinct sections the teacher may mark attendance for. */
const mySections = asyncHandler(async (req, res) => {
  const assignments = await prisma.subjectAssignment.findMany({
    where: { teacherId: req.user.id },
    select: { classId: true, sectionId: true },
  });

  const classWide = [
    ...new Set(assignments.filter((row) => !row.sectionId).map((row) => row.classId)),
  ];
  const direct = [...new Set(assignments.map((row) => row.sectionId).filter(Boolean))];

  const sections = await prisma.section.findMany({
    where: {
      OR: [{ id: { in: direct } }, { classId: { in: classWide } }],
    },
    include: { schoolClass: true, _count: { select: { students: true } } },
    orderBy: [{ classId: 'asc' }, { name: 'asc' }],
  });

  res.json({ success: true, data: { sections } });
});

module.exports = { overview, mySections };
