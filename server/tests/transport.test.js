import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { setupApp, superAdmin, restrictedAdmin, tokenFor } from './helpers/app.js';

const { app, prisma, reset } = setupApp();

const signIn = (user) => {
  prisma.user.findUnique.mockResolvedValue(user);
  return tokenFor(user);
};

const route = {
  id: 'route-1',
  name: 'Mirpur Route',
  description: 'Mirpur 10 → school',
  stops: [
    {
      id: 'stop-1',
      routeId: 'route-1',
      name: 'Mirpur 10',
      sequence: 1,
      pickupTime: '07:00',
      monthlyFee: 800,
    },
  ],
  vehicles: [],
  _count: { assignments: 0 },
};

describe('transport routes', () => {
  beforeEach(() => reset());

  it('lists routes with stops and rider counts for staff', async () => {
    const token = signIn(superAdmin);
    prisma.route.findMany.mockResolvedValue([route]);

    const res = await request(app).get('/api/transport/routes').set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.data.routes[0].stops).toHaveLength(1);
  });

  it('creates a route with transport.write', async () => {
    const token = signIn(superAdmin);
    prisma.route.create.mockResolvedValue({
      ...route,
      stops: [],
      vehicles: [],
      _count: { assignments: 0 },
    });

    const res = await request(app)
      .post('/api/transport/routes')
      .set('Authorization', token)
      .send({ name: 'Dhanmondi Route', description: 'Dhanmondi 8 → school' });

    expect(res.status).toBe(201);
  });

  it('rejects a cashier without transport.write', async () => {
    const token = signIn(restrictedAdmin); // fees only

    const res = await request(app)
      .post('/api/transport/routes')
      .set('Authorization', token)
      .send({ name: 'Dhanmondi Route' });

    expect(res.status).toBe(403);
  });

  it('blocks deleting a route that still has riders with 409', async () => {
    const token = signIn(superAdmin);
    prisma.studentTransport.count.mockResolvedValue(3);

    const res = await request(app)
      .delete('/api/transport/routes/route-1')
      .set('Authorization', token);

    expect(res.status).toBe(409);
    expect(prisma.route.delete).not.toHaveBeenCalled();
  });

  it('adds a stop to a route', async () => {
    const token = signIn(superAdmin);
    prisma.route.findUnique.mockResolvedValue(route);
    prisma.stop.create.mockResolvedValue({ id: 'stop-2', name: 'Pallabi', sequence: 2 });

    const res = await request(app).post('/api/transport/stops').set('Authorization', token).send({
      routeId: 'route-1',
      name: 'Pallabi',
      sequence: 2,
      pickupTime: '07:30',
      monthlyFee: 600,
    });

    expect(res.status).toBe(201);
  });
});

describe('transport vehicles', () => {
  beforeEach(() => reset());

  it('creates a vehicle and rejects a duplicate registration', async () => {
    const token = signIn(superAdmin);
    prisma.vehicle.findUnique.mockResolvedValue({ id: 'existing' });

    const res = await request(app)
      .post('/api/transport/vehicles')
      .set('Authorization', token)
      .send({ regNo: 'DHAKA-METRO-GA-11-2345', capacity: 36 });

    expect(res.status).toBe(409);
  });

  it('creates a vehicle with a valid registration', async () => {
    const token = signIn(superAdmin);
    prisma.vehicle.findUnique.mockResolvedValue(null);
    prisma.vehicle.create.mockResolvedValue({
      id: 'vehicle-1',
      regNo: 'DHAKA-METRO-GA-11-2345',
      capacity: 36,
    });

    const res = await request(app)
      .post('/api/transport/vehicles')
      .set('Authorization', token)
      .send({
        regNo: 'DHAKA-METRO-GA-11-2345',
        model: 'Hino Rosa',
        capacity: 36,
        driverName: 'Karim Uddin',
      });

    expect(res.status).toBe(201);
  });
});

describe('transport assignments', () => {
  beforeEach(() => reset());

  it('assigns a student to a stop on the chosen route', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1', firstName: 'Naim' });
    prisma.route.findUnique.mockResolvedValue(route);
    prisma.stop.findFirst.mockResolvedValue(route.stops[0]);
    prisma.studentTransport.upsert.mockResolvedValue({
      id: 'transport-1',
      studentId: 'student-1',
      routeId: 'route-1',
      stopId: 'stop-1',
      monthlyFee: 800,
      student: {
        id: 'student-1',
        firstName: 'Naim',
        lastName: 'Khan',
        admissionNo: 'ADV-2026-0001',
      },
      route,
      stop: route.stops[0],
    });

    const res = await request(app)
      .post('/api/transport/assignments')
      .set('Authorization', token)
      .send({ studentId: 'student-1', routeId: 'route-1', stopId: 'stop-1', monthlyFee: 800 });

    expect(res.status).toBe(201);
    expect(res.body.data.assignment.stopId).toBe('stop-1');
  });

  it('rejects a stop that does not belong to the route with 400', async () => {
    const token = signIn(superAdmin);
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    prisma.route.findUnique.mockResolvedValue(route);
    prisma.stop.findFirst.mockResolvedValue(null); // stop not on this route

    const res = await request(app)
      .post('/api/transport/assignments')
      .set('Authorization', token)
      .send({ studentId: 'student-1', routeId: 'route-1', stopId: 'stop-elsewhere' });

    expect(res.status).toBe(400);
  });

  it('unassigns a student', async () => {
    const token = signIn(superAdmin);
    prisma.studentTransport.findUnique.mockResolvedValue({ studentId: 'student-1' });
    prisma.studentTransport.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/transport/assignments/student-1')
      .set('Authorization', token);

    expect(res.status).toBe(200);
  });
});
