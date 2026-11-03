import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, admin, teacher, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

describe('GET /api/admin/users', () => {
  beforeEach(() => reset());

  it('lists staff accounts for the super admin', async () => {
    const token = signIn(superAdmin);
    prisma.user.findMany.mockResolvedValue([superAdmin, admin]);

    const res = await request(app).get('/api/admin/users').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(2);
    expect(res.body.data.users[1].role).toBe('ADMIN');
    expect(res.body.data.users[1].permissions).toEqual(admin.permissions);
  });

  it('exposes the school permission catalogue to the super admin', async () => {
    const token = signIn(superAdmin);

    const res = await request(app).get('/api/admin/users/permissions').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.permissions).toContain('fees.write');
    expect(res.body.data.permissions).toContain('students.write');
    expect(res.body.data.permissions).toContain('settings.write');
    expect(res.body.data.permissions).not.toContain('products.write');
  });

  it('rejects a standard admin and a teacher', async () => {
    prisma.user.findUnique.mockResolvedValue(admin);
    const asAdmin = await request(app)
      .get('/api/admin/users')
      .set('Authorization', tokenFor(admin));
    expect(asAdmin.status).toBe(403);

    prisma.user.findUnique.mockResolvedValue(teacher);
    const asTeacher = await request(app)
      .get('/api/admin/users')
      .set('Authorization', tokenFor(teacher));
    expect(asTeacher.status).toBe(403);
  });
});

describe('POST /api/admin/users', () => {
  beforeEach(() => reset());

  it('creates an admin with the selected permissions', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValueOnce(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      id: 'user-new',
      createdAt: new Date().toISOString(),
      ...data,
    }));

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', tokenFor(superAdmin))
      .send({
        name: 'Accounts Admin',
        email: 'accounts@aurora.school',
        password: 'password123',
        permissions: ['fees.write'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('ADMIN');
    expect(res.body.data.user.permissions).toEqual(['fees.write']);

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.role).toBe('ADMIN');
    expect(data.passwordHash).not.toBe('password123');
  });

  it('rejects unknown permissions with 400', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', tokenFor(superAdmin))
      .send({
        name: 'Accounts Admin',
        email: 'accounts@aurora.school',
        password: 'password123',
        permissions: ['root.everything'],
      });

    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin)
      .mockResolvedValueOnce({ id: 'existing' });

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', tokenFor(superAdmin))
      .send({ name: 'Accounts Admin', email: 'accounts@aurora.school', password: 'password123' });

    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/admin/users/:id', () => {
  beforeEach(() => reset());

  it('updates the permissions of a standard admin', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValueOnce(admin);
    prisma.user.update.mockResolvedValue({ ...admin, permissions: ['students.write'] });

    const res = await request(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set('Authorization', tokenFor(superAdmin))
      .send({ permissions: ['students.write'] });

    expect(res.status).toBe(200);
    expect(res.body.data.user.permissions).toEqual(['students.write']);
  });

  it('refuses to edit the super admin account', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValueOnce(superAdmin);

    const res = await request(app)
      .patch(`/api/admin/users/${superAdmin.id}`)
      .set('Authorization', tokenFor(superAdmin))
      .send({ permissions: ['fees.write'] });

    expect(res.status).toBe(403);
  });
});
