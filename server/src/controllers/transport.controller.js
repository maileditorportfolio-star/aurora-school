const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  routeSchema,
  stopSchema,
  vehicleSchema,
  transportAssignSchema,
  parse,
} = require('../validation/schemas');

// ---------- Routes & stops ----------

/** GET /api/transport/routes */
const listRoutes = asyncHandler(async (_req, res) => {
  const routes = await prisma.route.findMany({
    include: {
      stops: { orderBy: { sequence: 'asc' } },
      vehicles: true,
      _count: { select: { assignments: { where: { active: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: { routes } });
});

/** POST /api/transport/routes */
const createRoute = asyncHandler(async (req, res) => {
  const data = parse(routeSchema, req.body);
  const route = await prisma.route.create({
    data: { ...data, description: data.description || null },
  });
  res.status(201).json({ success: true, data: { route } });
});

/** PATCH /api/transport/routes/:id */
const updateRoute = asyncHandler(async (req, res) => {
  const data = parse(routeSchema.partial(), req.body);
  const route = await prisma.route.update({
    where: { id: req.params.id },
    data: { ...data, description: data.description === '' ? null : data.description },
  });
  res.json({ success: true, data: { route } });
});

/** DELETE /api/transport/routes/:id */
const removeRoute = asyncHandler(async (req, res) => {
  const assignments = await prisma.studentTransport.count({
    where: { routeId: req.params.id, active: true },
  });
  if (assignments > 0) throw ApiError.conflict('Unassign the students on this route first');

  await prisma.route.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

/** POST /api/transport/stops */
const createStop = asyncHandler(async (req, res) => {
  const data = parse(stopSchema, req.body);
  const route = await prisma.route.findUnique({ where: { id: data.routeId } });
  if (!route) throw ApiError.notFound('Route not found');

  const stop = await prisma.stop.create({
    data: { ...data, pickupTime: data.pickupTime || null },
  });
  res.status(201).json({ success: true, data: { stop } });
});

/** DELETE /api/transport/stops/:id */
const removeStop = asyncHandler(async (req, res) => {
  await prisma.stop.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

// ---------- Vehicles ----------

/** GET /api/transport/vehicles */
const listVehicles = asyncHandler(async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    include: { route: true },
    orderBy: { regNo: 'asc' },
  });
  res.json({ success: true, data: { vehicles } });
});

/** POST /api/transport/vehicles */
const createVehicle = asyncHandler(async (req, res) => {
  const data = parse(vehicleSchema, req.body);
  const existing = await prisma.vehicle.findUnique({ where: { regNo: data.regNo } });
  if (existing) throw ApiError.conflict('That registration number is already in use');

  const vehicle = await prisma.vehicle.create({
    data: { ...data, routeId: data.routeId || null, driverPhone: data.driverPhone || null },
    include: { route: true },
  });
  res.status(201).json({ success: true, data: { vehicle } });
});

/** PATCH /api/transport/vehicles/:id */
const updateVehicle = asyncHandler(async (req, res) => {
  const data = parse(vehicleSchema.partial(), req.body);
  const vehicle = await prisma.vehicle.update({
    where: { id: req.params.id },
    data: { ...data, routeId: data.routeId === '' ? null : data.routeId },
    include: { route: true },
  });
  res.json({ success: true, data: { vehicle } });
});

/** DELETE /api/transport/vehicles/:id */
const removeVehicle = asyncHandler(async (req, res) => {
  await prisma.vehicle.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

// ---------- Assignments ----------

/** GET /api/transport/assignments?routeId= */
const listAssignments = asyncHandler(async (req, res) => {
  const { routeId } = req.query;
  const assignments = await prisma.studentTransport.findMany({
    where: routeId ? { routeId: String(routeId) } : {},
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNumber: true },
      },
      route: true,
      stop: true,
    },
    orderBy: { startDate: 'desc' },
  });

  res.json({ success: true, data: { assignments } });
});

/** POST /api/transport/assignments — assign/reassign a student to a route + stop. */
const assignStudent = asyncHandler(async (req, res) => {
  const { studentId, routeId, stopId, monthlyFee } = parse(transportAssignSchema, req.body);

  const [student, route] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId } }),
    prisma.route.findUnique({ where: { id: routeId } }),
  ]);
  if (!student) throw ApiError.notFound('Student not found');
  if (!route) throw ApiError.notFound('Route not found');
  if (stopId) {
    const stop = await prisma.stop.findFirst({ where: { id: stopId, routeId } });
    if (!stop) throw ApiError.badRequest('That stop does not belong to this route');
  }

  const assignment = await prisma.studentTransport.upsert({
    where: { studentId },
    create: { studentId, routeId, stopId: stopId || null, monthlyFee, active: true },
    update: { routeId, stopId: stopId || null, monthlyFee, active: true },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNumber: true },
      },
      route: true,
      stop: true,
    },
  });

  res.status(201).json({ success: true, data: { assignment } });
});

/** DELETE /api/transport/assignments/:studentId — unassign. */
const unassignStudent = asyncHandler(async (req, res) => {
  const existing = await prisma.studentTransport.findUnique({
    where: { studentId: req.params.studentId },
  });
  if (!existing) throw ApiError.notFound('Transport assignment not found');

  await prisma.studentTransport.delete({ where: { studentId: existing.studentId } });
  res.json({ success: true, data: { studentId: existing.studentId } });
});

module.exports = {
  listRoutes,
  createRoute,
  updateRoute,
  removeRoute,
  createStop,
  removeStop,
  listVehicles,
  createVehicle,
  updateVehicle,
  removeVehicle,
  listAssignments,
  assignStudent,
  unassignStudent,
};
