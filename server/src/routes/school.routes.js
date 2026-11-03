const express = require('express');
const school = require('../controllers/school.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public read for the landing page; writes are guarded by settings.write (super admins bypass).
router.get('/settings/public', school.publicSettings);
router.get('/admin/settings', requireAuth, requireAdmin, school.adminSettings);
router.patch(
  '/admin/settings',
  requireAuth,
  requirePermission('settings.write'),
  school.updateSettings,
);

module.exports = router;
