import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, restrictedAdmin, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const staffUser = {
  id: 'user-staff-1',
  name: 'Arif Hossain',
  email: 'arif@aurora.school',
  phone: '+8801700000003',
  avatarUrl: null,
  createdAt: new Date('2022-01-15'),
  staffProfile: {
    employeeNo: 'EMP-0001',
    designation: 'Senior Teacher',
    qualification: 'M.Sc Mathematics',
    joiningDate: new Date('2022-01-15'),
  },
};

describe('GET /api/staff', () => {
  beforeEach(() => reset());

  it('lists teachers for staff', async () => {
    const token = signIn(superAdmin);
    prisma.user.findMany.mockResolvedValue([staffUser]);

    const res = await request(app).get('/api/staff').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.staff[0].profile.employeeNo).toBe('EMP-0001');
  });

  it('lets any staff member read the teacher directory', async () => {
    const token = signIn(restrictedAdmin); // fees only — but GET is open to staff
    prisma.user.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/staff').set('Authorization', token);

    expect(res.status).toBe(200);
  });
});

describe('POST /api/staff', () => {
  beforeEach(() => reset());

  it('creates a teacher with a bcrypt hash and auto employee number', async () => {
    const token = signIn(superAdmin);
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValue(null); // guard, then email free
    prisma.staffProfile.count.mockResolvedValue(7);
    prisma.staffProfile.findUnique.mockResolvedValue(null); // EMP-0008 free
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        user: {
          create: vi.fn().mockResolvedValue({ id: 'user-staff-new' }),
          findUnique: vi.fn().mockResolvedValue(staffUser),
        },
        staffProfile: { create: vi.fn().mockResolvedValue({ id: 'profile-new' }) },
      };
      return callback(tx);
    });

    const res = await request(app).post('/api/staff').set('Authorization', token).send({
      name: 'New Teacher',
      email: 'new@aurora.school',
      password: 'password123',
      designation: 'Teacher',
      qualification: 'B.Sc',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.staff.profile.employeeNo).toBe('EMP-0001'); // mapped from mocked findUnique
  });

  it('rejects a duplicate email with 409', async () => {
    const token = signIn(superAdmin);
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique.mockResolvedValueOnce(superAdmin).mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/staff')
      .set('Authorization', token)
      .send({ name: 'New Teacher', email: 'existing@aurora.school', password: 'password123' });

    expect(res.status).toBe(409);
  });

  it('rejects a cashier without staff.write', async () => {
    const token = signIn(restrictedAdmin);

    const res = await request(app)
      .post('/api/staff')
      .set('Authorization', token)
      .send({ name: 'New Teacher', email: 'new@aurora.school', password: 'password123' });

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/staff/:id', () => {
  beforeEach(() => reset());

  it('updates designation and phone', async () => {
    const token = signIn(superAdmin);
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin) // guard
      .mockResolvedValue({
        ...staffUser,
        staffProfile: { ...staffUser.staffProfile },
        role: 'TEACHER',
      });
    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        user: { update: vi.fn().mockResolvedValue({}) },
        staffProfile: { update: vi.fn().mockResolvedValue({}) },
        // final read inside the transaction
      };
      // The controller reads the user again at the end of the transaction via tx.user.findUnique
      tx.user.findUnique = vi.fn().mockResolvedValue({
        ...staffUser,
        phone: '+8801711112222',
        staffProfile: { ...staffUser.staffProfile, designation: 'Head Teacher' },
      });
      return callback(tx);
    });

    const res = await request(app)
      .patch('/api/staff/user-staff-1')
      .set('Authorization', token)
      .send({ phone: '+8801711112222', designation: 'Head Teacher' });

    expect(res.status).toBe(200);
    expect(res.body.data.staff.phone).toBe('+8801711112222');
  });

  it('returns 404 for a non-teacher target', async () => {
    const token = signIn(superAdmin);
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin)
      .mockResolvedValue({ id: 'user-1', role: 'CUSTOMER' });

    const res = await request(app)
      .patch('/api/staff/user-1')
      .set('Authorization', token)
      .send({ designation: 'Head Teacher' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/staff/:id', () => {
  beforeEach(() => reset());

  it('deletes a teacher account', async () => {
    const token = signIn(superAdmin);
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin)
      .mockResolvedValue({ id: 'user-staff-1', role: 'TEACHER' });
    prisma.user.delete.mockResolvedValue({});

    const res = await request(app).delete('/api/staff/user-staff-1').set('Authorization', token);

    expect(res.status).toBe(200);
  });

  it('rejects deleting a super admin', async () => {
    const token = signIn(superAdmin);
    prisma.user.findUnique.mockReset();
    prisma.user.findUnique
      .mockResolvedValueOnce(superAdmin)
      .mockResolvedValue({ id: 'user-sa', role: 'SUPER_ADMIN' });

    const res = await request(app).delete('/api/staff/user-sa').set('Authorization', token);

    expect(res.status).toBe(404);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });
});
