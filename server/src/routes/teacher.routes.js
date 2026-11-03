const express = require('express');
const teacher = require('../controllers/teacher.controller');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/overview', requireTeacher, teacher.overview);
router.get('/sections', requireTeacher, teacher.mySections);

module.exports = router;
