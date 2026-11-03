import { describe, it, expect } from 'vitest';
import { request, app, signIn } from './helpers.js';

describe('live auth flow', () => {
  it('signs in with the seeded super admin and reads the profile', async () => {
    const token = await signIn('admin@aurora.school');

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@aurora.school');
    expect(res.body.data.user.role).toBe('SUPER_ADMIN');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aurora.school', password: 'definitely-not-the-password' });

    expect(res.status).toBe(401);
  });

  it('rejects a request without a token with 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('rejects self-registration — accounts are provisioned by the school', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Sneaky User', email: 'sneaky@aurora.school', password: 'password123' });

    expect(res.status).toBe(404);
  });
});
