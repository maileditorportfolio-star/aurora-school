const express = require('express');
const classes = require('../controllers/classes.controller');
const {
  requireAuth,
  requireAdmin,
  requireStaffOrTeacher,
  requirePermission,
} = require('../middleware/auth');

const router = express.Router();

// Note: this router is mounted at '/', so authentication is applied per route.
router.get('/classes', requireAuth, requireStaffOrTeacher, classes.tree);
router.post('/classes', requireAuth, requirePermission('classes.write'), classes.createClass);
router.patch('/classes/:id', requireAuth, requirePermission('classes.write'), classes.updateClass);
router.delete('/classes/:id', requireAuth, requirePermission('classes.write'), classes.removeClass);
router.post(
  '/classes/:classId/subjects',
  requireAuth,
  requirePermission('classes.write'),
  classes.addClassSubject,
);
router.delete(
  '/classes/:classId/subjects/:subjectId',
  requireAuth,
  requirePermission('classes.write'),
  classes.removeClassSubject,
);

router.post('/sections', requireAuth, requirePermission('classes.write'), classes.createSection);
router.delete(
  '/sections/:id',
  requireAuth,
  requirePermission('classes.write'),
  classes.removeSection,
);

router.get('/subjects', requireAuth, requireStaffOrTeacher, classes.listSubjects);
router.post('/subjects', requireAuth, requirePermission('classes.write'), classes.createSubject);
router.patch(
  '/subjects/:id',
  requireAuth,
  requirePermission('classes.write'),
  classes.updateSubject,
);
router.delete(
  '/subjects/:id',
  requireAuth,
  requirePermission('classes.write'),
  classes.removeSubject,
);

router.get('/assignments', requireAuth, requireAdmin, classes.listAssignments);
router.post(
  '/assignments',
  requireAuth,
  requirePermission('classes.write'),
  classes.createAssignment,
);
router.delete(
  '/assignments/:id',
  requireAuth,
  requirePermission('classes.write'),
  classes.removeAssignment,
);

router.get('/academic-years', requireAuth, requireAdmin, classes.listAcademicYears);
router.post(
  '/academic-years',
  requireAuth,
  requirePermission('classes.write'),
  classes.createAcademicYear,
);

module.exports = router;
