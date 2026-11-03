import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

describe('GET /api/metrics', () => {
  beforeEach(() => reset());

  it('returns process and school metrics', async () => {
    prisma.user.count.mockResolvedValue(12);
    prisma.student.count.mockResolvedValue(40);
    prisma.feeInvoice.count.mockResolvedValue(80);
    prisma.notice.count.mockResolvedValue(4);

    const res = await request(app).get('/api/metrics');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data.pid).toBe(process.pid);
    expect(res.body.data.memory).toHaveProperty('heapUsed');
    expect(res.body.data.school).toEqual({
      users: 12,
      students: 40,
      feeInvoices: 80,
      notices: 4,
    });
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('scopes the student count to active students', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.student.count.mockResolvedValue(0);
    prisma.feeInvoice.count.mockResolvedValue(0);
    prisma.notice.count.mockResolvedValue(0);

    await request(app).get('/api/metrics');

    expect(prisma.student.count).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
  });

  it('exposes the node version and rss memory', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.student.count.mockResolvedValue(0);
    prisma.feeInvoice.count.mockResolvedValue(0);
    prisma.notice.count.mockResolvedValue(0);

    const res = await request(app).get('/api/metrics');

    expect(res.body.data.nodeVersion).toBe(process.version);
    expect(typeof res.body.data.memory.rss).toBe('number');
    expect(res.body.data.memory.rss).toBeGreaterThan(0);
  });
});
