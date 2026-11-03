const express = require('express');
const students = require('../controllers/students.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireAdmin, students.list);
router.post('/', requirePermission('students.write'), students.create);
router.get('/:id', requireAdmin, students.detail);
router.patch('/:id', requirePermission('students.write'), students.update);
router.delete('/:id', requirePermission('students.write'), students.archive);
router.post('/:id/account', requirePermission('students.write'), students.createAccount);
router.post('/:studentId/guardians', requirePermission('students.write'), students.addGuardian);
router.post(
  '/guardians/:id/account',
  requirePermission('students.write'),
  students.createGuardianAccount,
);

module.exports = router;
