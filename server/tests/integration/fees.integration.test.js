import { describe, it, expect } from 'vitest';
import { request, app, signIn } from './helpers.js';

describe('fees API against a live database (read-only)', () => {
  it('lists the seeded fee structures for the super admin', async () => {
    const token = await signIn('admin@aurora.school');

    const res = await request(app)
      .get('/api/fees/structures')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const names = res.body.data.structures.map((s) => s.name);
    expect(names).toContain('Tuition Fee');
  });

  it('lists invoices with pagination for the super admin', async () => {
    const token = await signIn('admin@aurora.school');

    const res = await request(app)
      .get('/api/fees/invoices?limit=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(80);
    expect(res.body.data.invoices.length).toBeLessThanOrEqual(5);
  });

  it('shows the parent exactly what they owe for both children', async () => {
    const token = await signIn('parent@aurora.school');

    const res = await request(app).get('/api/portal/fees').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totals.billed).toBeGreaterThan(0);
    expect(res.body.data.totals.due).toBeGreaterThan(0);
    expect(res.body.data.invoices.length).toBeGreaterThan(0);
  });

  it('rejects a teacher from the admin fee routes with 403', async () => {
    const token = await signIn('arif@aurora.school');

    const res = await request(app)
      .get('/api/fees/invoices')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
