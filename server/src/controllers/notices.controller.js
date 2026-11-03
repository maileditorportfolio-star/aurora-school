const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { noticeSchema, eventSchema, parse } = require('../validation/schemas');

const noticeInclude = { author: { select: { id: true, name: true } } };

/** GET /api/notices/public — live, non-expired notices for the landing page. */
const publicList = asyncHandler(async (_req, res) => {
  const now = new Date();
  const notices = await prisma.notice.findMany({
    where: {
      audience: { in: ['ALL', 'STUDENTS', 'PARENTS'] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: 10,
    include: noticeInclude,
  });

  res.json({ success: true, data: { notices } });
});

/** GET /api/notices — management list (all audiences, including expired). */
const list = asyncHandler(async (_req, res) => {
  const notices = await prisma.notice.findMany({
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    include: noticeInclude,
  });

  res.json({ success: true, data: { notices } });
});

/** POST /api/notices */
const create = asyncHandler(async (req, res) => {
  const data = parse(noticeSchema, req.body);
  const notice = await prisma.notice.create({
    data: {
      ...data,
      expiresAt: data.expiresAt || null,
      authorId: req.user?.id || null,
    },
    include: noticeInclude,
  });

  res.status(201).json({ success: true, data: { notice } });
});

/** PATCH /api/notices/:id */
const update = asyncHandler(async (req, res) => {
  const data = parse(noticeSchema.partial(), req.body);
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Notice not found');

  const notice = await prisma.notice.update({
    where: { id: existing.id },
    data: { ...data, expiresAt: data.expiresAt === '' ? null : data.expiresAt },
    include: noticeInclude,
  });

  res.json({ success: true, data: { notice } });
});

/** DELETE /api/notices/:id */
const remove = asyncHandler(async (req, res) => {
  const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Notice not found');

  await prisma.notice.delete({ where: { id: existing.id } });
  res.json({ success: true, data: { id: existing.id } });
});

// ---------- Events ----------

/** GET /api/events/public — upcoming events for the landing page. */
const publicEvents = asyncHandler(async (_req, res) => {
  const events = await prisma.event.findMany({
    where: {
      audience: { in: ['ALL', 'STUDENTS', 'PARENTS'] },
      OR: [{ endAt: { gte: new Date() } }, { endAt: null, startAt: { gte: new Date() } }],
    },
    orderBy: { startAt: 'asc' },
    take: 6,
  });

  res.json({ success: true, data: { events } });
});

/** GET /api/events */
const listEvents = asyncHandler(async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { startAt: 'desc' } });
  res.json({ success: true, data: { events } });
});

/** POST /api/events */
const createEvent = asyncHandler(async (req, res) => {
  const data = parse(eventSchema, req.body);
  if (data.endAt && data.endAt < data.startAt)
    throw ApiError.badRequest('End time must be after the start');

  const event = await prisma.event.create({ data: { ...data, endAt: data.endAt || null } });
  res.status(201).json({ success: true, data: { event } });
});

/** PATCH /api/events/:id */
const updateEvent = asyncHandler(async (req, res) => {
  const data = parse(eventSchema.partial(), req.body);
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Event not found');

  const event = await prisma.event.update({
    where: { id: existing.id },
    data: { ...data, endAt: data.endAt === '' ? null : data.endAt },
  });
  res.json({ success: true, data: { event } });
});

/** DELETE /api/events/:id */
const removeEvent = asyncHandler(async (req, res) => {
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Event not found');

  await prisma.event.delete({ where: { id: existing.id } });
  res.json({ success: true, data: { id: existing.id } });
});

module.exports = {
  publicList,
  list,
  create,
  update,
  remove,
  publicEvents,
  listEvents,
  createEvent,
  updateEvent,
  removeEvent,
};
