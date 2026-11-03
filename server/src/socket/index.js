const { Server } = require('socket.io');
const prisma = require('../config/prisma');
const env = require('../config/env');
const logger = require('../config/logger');
const { verifyToken } = require('../services/token.service');

const ADMIN_ROOM = 'admins';
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

/**
 * Boots the Socket.io server for real-time customer support chat.
 * Customers join a conversation room; agents join the global admin room.
 */
const initChat = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      socket.data.user = null;
      return next();
    }
    try {
      const payload = verifyToken(token);
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch (error) {
      socket.data.user = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const isAgent = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    if (isAgent) socket.join(ADMIN_ROOM);

    socket.on('chat:join', async ({ conversationId = 'support' } = {}) => {
      socket.join(conversationRoom(conversationId));
      if (isAgent) {
        const history = await prisma.message.findMany({
          where: { conversationId },
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        });
        socket.emit('chat:history', { conversationId, messages: history });
      }
    });

    socket.on('chat:leave', ({ conversationId = 'support' } = {}) => {
      socket.leave(conversationRoom(conversationId));
    });

    socket.on('chat:message', async ({ conversationId = 'support', content } = {}) => {
      const text = String(content || '').trim();
      if (!text) return;

      try {
        const message = await prisma.message.create({
          data: {
            conversationId,
            content: text.slice(0, 2000),
            userId: user?.id || null,
            sender: isAgent ? 'ADMIN' : 'USER',
          },
          include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
        });

        io.to(conversationRoom(conversationId)).emit('chat:message', { message });
        io.to(ADMIN_ROOM).emit('chat:message', { message });
      } catch (error) {
        logger.error({ err: error }, 'failed to persist chat message');
      }
    });

    socket.on('chat:typing', ({ conversationId = 'support' } = {}) => {
      socket
        .to(conversationRoom(conversationId))
        .emit('chat:typing', { conversationId, userId: user?.id || null });
    });

    socket.on('chat:read', async ({ conversationId = 'support' } = {}) => {
      await prisma.message.updateMany({
        where: { conversationId, readAt: null, sender: isAgent ? 'USER' : 'ADMIN' },
        data: { readAt: new Date() },
      });
      socket.to(conversationRoom(conversationId)).emit('chat:read', { conversationId });
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'chat socket disconnected');
    });
  });

  return io;
};

module.exports = { initChat, ADMIN_ROOM, conversationRoom };
