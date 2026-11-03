const express = require('express');
const attendance = require('../controllers/attendance.controller');
const { requireAuth, requireStaffOrTeacher } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireStaffOrTeacher, attendance.bySection);
router.get('/summary', requireStaffOrTeacher, attendance.summary);
router.post('/mark', requireStaffOrTeacher, attendance.mark);

module.exports = router;
