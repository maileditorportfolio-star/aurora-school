const express = require('express');
const staff = require('../controllers/staff.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireAdmin, staff.list);
router.post('/', requirePermission('staff.write'), staff.create);
router.patch('/:id', requirePermission('staff.write'), staff.update);
router.delete('/:id', requirePermission('staff.write'), staff.remove);

module.exports = router;
