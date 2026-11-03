const express = require('express');
const transport = require('../controllers/transport.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/routes', requireAdmin, transport.listRoutes);
router.post('/routes', requirePermission('transport.write'), transport.createRoute);
router.patch('/routes/:id', requirePermission('transport.write'), transport.updateRoute);
router.delete('/routes/:id', requirePermission('transport.write'), transport.removeRoute);
router.post('/stops', requirePermission('transport.write'), transport.createStop);
router.delete('/stops/:id', requirePermission('transport.write'), transport.removeStop);

router.get('/vehicles', requireAdmin, transport.listVehicles);
router.post('/vehicles', requirePermission('transport.write'), transport.createVehicle);
router.patch('/vehicles/:id', requirePermission('transport.write'), transport.updateVehicle);
router.delete('/vehicles/:id', requirePermission('transport.write'), transport.removeVehicle);

router.get('/assignments', requireAdmin, transport.listAssignments);
router.post('/assignments', requirePermission('transport.write'), transport.assignStudent);
router.delete(
  '/assignments/:studentId',
  requirePermission('transport.write'),
  transport.unassignStudent,
);

module.exports = router;
