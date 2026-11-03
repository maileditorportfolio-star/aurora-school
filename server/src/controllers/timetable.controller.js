const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { timetableUpsertSchema, parse } = require('../validation/schemas');

const slotInclude = { subject: true, section: { include: { schoolClass: true } } };

const mapSlot = (slot) => ({
  id: slot.id,
  dayOfWeek: slot.dayOfWeek,
  periodNo: slot.periodNo,
  startTime: slot.startTime,
  endTime: slot.endTime,
  kind: slot.kind,
  room: slot.room,
  subject: slot.subject
    ? { id: slot.subject.id, name: slot.subject.name, code: slot.subject.code }
    : null,
  section: slot.section
    ? {
        id: slot.section.id,
        name: slot.section.name,
        className: slot.section.schoolClass?.name ?? null,
      }
    : null,
});

/** GET /api/timetable?sectionId= */
const bySection = asyncHandler(async (req, res) => {
  const sectionId = req.query.sectionId;
  if (!sectionId) throw ApiError.badRequest('sectionId is required');

  const section = await prisma.section.findUnique({
    where: { id: String(sectionId) },
    include: { schoolClass: true },
  });
  if (!section) throw ApiError.notFound('Section not found');

  const slots = await prisma.timetableSlot.findMany({
    where: { sectionId: section.id },
    include: { subject: true },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
  });

  // Teacher names live on User, not on the slot — resolve once for the whole grid.
  const teacherIds = [...new Set(slots.map((slot) => slot.teacherId).filter(Boolean))];
  const teachers = teacherIds.length
    ? await prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, name: true },
      })
    : [];
  const teacherName = new Map(teachers.map((teacher) => [teacher.id, teacher.name]));

  res.json({
    success: true,
    data: {
      section: { id: section.id, name: section.name, className: section.schoolClass.name },
      slots: slots.map((slot) => ({
        ...mapSlot(slot),
        teacherName: slot.teacherId ? teacherName.get(slot.teacherId) || null : null,
        teacherId: slot.teacherId,
      })),
    },
  });
});

/** GET /api/timetable/teacher — the signed-in teacher's weekly grid. */
const teacherMine = asyncHandler(async (req, res) => {
  const slots = await prisma.timetableSlot.findMany({
    where: { teacherId: req.user.id },
    include: slotInclude,
    orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
  });

  res.json({ success: true, data: { slots: slots.map(mapSlot) } });
});

/** PUT /api/timetable/slots — replace the whole grid for one section. */
const replaceSlots = asyncHandler(async (req, res) => {
  const { sectionId, slots } = parse(timetableUpsertSchema, req.body);

  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');

  const keys = new Set();
  for (const slot of slots) {
    const key = `${slot.dayOfWeek}:${slot.periodNo}`;
    if (keys.has(key))
      throw ApiError.badRequest(`Duplicate slot on day ${slot.dayOfWeek}, period ${slot.periodNo}`);
    keys.add(key);
    if (slot.endTime <= slot.startTime)
      throw ApiError.badRequest('End time must be after the start time');
  }

  await prisma.$transaction([
    prisma.timetableSlot.deleteMany({ where: { sectionId: section.id } }),
    ...(slots.length
      ? [
          prisma.timetableSlot.createMany({
            data: slots.map((slot) => ({
              sectionId: section.id,
              dayOfWeek: slot.dayOfWeek,
              periodNo: slot.periodNo,
              startTime: slot.startTime,
              endTime: slot.endTime,
              subjectId: slot.subjectId || null,
              teacherId: slot.teacherId || null,
              room: slot.room || null,
              kind: slot.kind,
            })),
          }),
        ]
      : []),
  ]);

  const saved = await prisma.timetableSlot.findMany({
    where: { sectionId: section.id },
    include: { subject: true },
    orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
  });

  res.json({ success: true, data: { slots: saved.map(mapSlot) } });
});

module.exports = { bySection, teacherMine, replaceSlots };
