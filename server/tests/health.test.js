import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

describe('GET /api/health', () => {
  beforeEach(() => reset());

  it('reports the service and database as healthy', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('up');
    expect(res.body.data.service).toBe('aurora-school-api');
  });

  it('reports the service as degraded when the database cannot be reached', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database).toBe('down');
  });

  it('exposes the process uptime', async () => {
    const res = await request(app).get('/api/health');

    expect(typeof res.body.data.uptime).toBe('number');
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('GET /', () => {
  beforeEach(() => reset());

  it('describes the API', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Aurora School API');
  });
});

describe('unknown routes', () => {
  beforeEach(() => reset());

  it('returns 404 for an endpoint that does not exist', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
