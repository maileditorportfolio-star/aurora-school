const express = require('express');
const timetable = require('../controllers/timetable.controller');
const {
  requireAuth,
  requireStaffOrTeacher,
  requireTeacher,
  requirePermission,
} = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', requireStaffOrTeacher, timetable.bySection);
router.get('/teacher', requireTeacher, timetable.teacherMine);
router.put('/slots', requirePermission('timetable.write'), timetable.replaceSlots);

module.exports = router;
