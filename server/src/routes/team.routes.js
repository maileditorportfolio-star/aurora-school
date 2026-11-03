const express = require('express');
const teamController = require('../controllers/team.controller');
const { ALL_PERMISSIONS } = require('../permissions');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

router.get('/permissions', (_req, res) => {
  res.json({ success: true, data: { permissions: ALL_PERMISSIONS } });
});

router.get('/', teamController.list);
router.post('/', teamController.create);
router.patch('/:id', teamController.update);

module.exports = router;
