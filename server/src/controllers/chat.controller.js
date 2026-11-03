const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { isStaff } = require('../middleware/auth');
const { messageSchema, parse } = require('../validation/schemas');

/** GET /api/chat/:conversationId — message history. */
const history = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
  });

  res.json({ success: true, data: { messages: messages.reverse() } });
});

/** POST /api/chat — persist a message and let the socket layer broadcast it. */
const create = asyncHandler(async (req, res) => {
  const { conversationId, content } = parse(messageSchema, req.body);

  const message = await prisma.message.create({
    data: {
      conversationId,
      content,
      userId: req.user?.id || null,
      sender: isStaff(req.user) ? 'ADMIN' : 'USER',
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
  });

  res.status(201).json({ success: true, data: { message } });
});

module.exports = { history, create };
