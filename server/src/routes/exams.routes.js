const express = require('express');
const exams = require('../controllers/exams.controller');
const { requireAuth, requireStaffOrTeacher, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Specific routes first so they are not swallowed by /:id.
router.post('/marks', requireStaffOrTeacher, exams.enterMarks);
router.get('/marks/gradebook', requireStaffOrTeacher, exams.gradebook);

router.get('/', requireStaffOrTeacher, exams.list);
router.get('/:id', requireStaffOrTeacher, exams.detail);
// Exam setup is a management task; teachers only enter marks for their subjects.
router.post('/', requirePermission('marks.write'), exams.create);
router.delete('/:id', requirePermission('marks.write'), exams.remove);

module.exports = router;
