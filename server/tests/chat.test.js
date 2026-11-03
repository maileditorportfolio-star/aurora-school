import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, student, superAdmin, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

describe('GET /api/chat/:conversationId', () => {
  beforeEach(() => reset());

  it('returns the message history oldest first', async () => {
    prisma.message.findMany.mockResolvedValue([
      { id: 'm2', content: 'Second' },
      { id: 'm1', content: 'First' },
    ]);

    const res = await request(app).get('/api/chat/support');

    expect(res.status).toBe(200);
    expect(res.body.data.messages.map((message) => message.id)).toEqual(['m1', 'm2']);
  });

  it('limits the number of messages returned', async () => {
    prisma.message.findMany.mockResolvedValue([]);

    await request(app).get('/api/chat/support?limit=5000');

    expect(prisma.message.findMany.mock.calls[0][0].take).toBe(100);
  });

  it('scopes the history to the requested conversation', async () => {
    prisma.message.findMany.mockResolvedValue([]);

    await request(app).get('/api/chat/fee-42');

    expect(prisma.message.findMany.mock.calls[0][0].where.conversationId).toBe('fee-42');
  });
});

describe('POST /api/chat', () => {
  beforeEach(() => reset());

  it('stores a message sent by a signed-in parent', async () => {
    prisma.user.findUnique.mockResolvedValue(student);
    prisma.message.create.mockResolvedValue({ id: 'm1', content: 'Hello there' });

    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', tokenFor(student))
      .send({ conversationId: 'support', content: 'Hello there' });

    expect(res.status).toBe(201);
    expect(res.body.data.message.content).toBe('Hello there');
    expect(prisma.message.create.mock.calls[0][0].data.sender).toBe('USER');
    expect(prisma.message.create.mock.calls[0][0].data.userId).toBe(student.id);
  });

  it('stores an anonymous message without a user', async () => {
    prisma.message.create.mockResolvedValue({ id: 'm2', content: 'Anonymous question' });

    const res = await request(app)
      .post('/api/chat')
      .send({ conversationId: 'support', content: 'Anonymous question' });

    expect(res.status).toBe(201);
    expect(prisma.message.create.mock.calls[0][0].data.userId).toBeNull();
    expect(prisma.message.create.mock.calls[0][0].data.sender).toBe('USER');
  });

  it('marks the sender as ADMIN for staff and super admins', async () => {
    prisma.user.findUnique.mockResolvedValue(superAdmin);
    prisma.message.create.mockResolvedValue({ id: 'm3', content: 'How can I help?' });

    await request(app)
      .post('/api/chat')
      .set('Authorization', tokenFor(superAdmin))
      .send({ conversationId: 'support', content: 'How can I help?' });

    expect(prisma.message.create.mock.calls[0][0].data.sender).toBe('ADMIN');
  });

  it('rejects an empty message with 400', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ conversationId: 'support', content: '' });

    expect(res.status).toBe(400);
    expect(res.body.details[0].message).toBe('Message cannot be empty');
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('defaults the conversation to the support channel', async () => {
    prisma.message.create.mockResolvedValue({ id: 'm4', content: 'Hi' });

    await request(app).post('/api/chat').send({ content: 'Hi' });

    expect(prisma.message.create.mock.calls[0][0].data.conversationId).toBe('support');
  });
});
