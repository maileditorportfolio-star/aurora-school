import { describe, it, expect } from 'vitest';
import { request, app } from './helpers.js';

describe('live health endpoint', () => {
  it('reports the database as healthy', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.database).toBe('up');
  });
});
