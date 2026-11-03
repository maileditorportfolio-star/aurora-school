const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

/** GET /api/admin/stats */
router.get('/stats', requirePermission('analytics.read'), adminController.stats);

module.exports = router;
