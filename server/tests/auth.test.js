import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupApp, student, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

describe('POST /api/auth/login', () => {
  beforeEach(() => reset());

  it('returns the profile and a token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('aurora123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      role: 'STUDENT',
      permissions: null,
      avatarUrl: null,
      passwordHash,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: 'aurora123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(student.email);
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('rejects an unknown email with 401 and the same message as a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@aurora.school', password: 'aurora123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects a wrong password with 401', async () => {
    const passwordHash = await bcrypt.hash('aurora123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: student.id,
      email: student.email,
      role: 'STUDENT',
      passwordHash,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: student.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('rejects a malformed email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'aurora123' });

    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'email', message: 'Enter a valid email address' }]);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => reset());

  it('returns the signed-in profile', async () => {
    prisma.user.findUnique.mockResolvedValue(student);

    const res = await request(app).get('/api/auth/me').set('Authorization', tokenFor(student));

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(student.email);
  });

  it('rejects a request without a token with 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects a malformed token with 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-token');

    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/auth/me', () => {
  beforeEach(() => reset());

  it('updates the display name and phone', async () => {
    prisma.user.findUnique.mockResolvedValue(student);
    prisma.user.update.mockResolvedValue({ ...student, name: 'Naim K.', phone: '+8801711112222' });

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', tokenFor(student))
      .send({ name: 'Naim K.', phone: '+8801711112222' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Naim K.');
    expect(res.body.data.user.phone).toBe('+8801711112222');
  });

  it('rejects an invalid phone number with 400', async () => {
    prisma.user.findUnique.mockResolvedValue(student);

    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', tokenFor(student))
      .send({ phone: 'not a phone!!' });

    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/auth/password', () => {
  beforeEach(() => reset());

  it('updates the stored hash when the current password matches', async () => {
    const passwordHash = await bcrypt.hash('aurora123', 4);
    prisma.user.findUnique.mockResolvedValue({ ...student, passwordHash });
    prisma.user.update.mockResolvedValue({ ...student });

    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', tokenFor(student))
      .send({ currentPassword: 'aurora123', newPassword: 'newpassword456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { where, data } = prisma.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: student.id });
    expect(data.passwordHash).not.toBe('newpassword456');
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects an incorrect current password with 400', async () => {
    const passwordHash = await bcrypt.hash('aurora123', 4);
    prisma.user.findUnique.mockResolvedValue({ ...student, passwordHash });

    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', tokenFor(student))
      .send({ currentPassword: 'not-my-password', newPassword: 'newpassword456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/incorrect/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a new password shorter than 8 characters with 400', async () => {
    prisma.user.findUnique.mockResolvedValue(student);

    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', tokenFor(student))
      .send({ currentPassword: 'aurora123', newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/at least 8 characters/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
