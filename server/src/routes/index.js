const express = require('express');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const authRoutes = require('./auth.routes');
const studentRoutes = require('./students.routes');
const staffRoutes = require('./staff.routes');
const classRoutes = require('./classes.routes');
const attendanceRoutes = require('./attendance.routes');
const examRoutes = require('./exams.routes');
const feeRoutes = require('./fees.routes');
const timetableRoutes = require('./timetable.routes');
const noticeRoutes = require('./notices.routes');
const libraryRoutes = require('./library.routes');
const transportRoutes = require('./transport.routes');
const schoolRoutes = require('./school.routes');
const portalRoutes = require('./portal.routes');
const teacherRoutes = require('./teacher.routes');
const chatRoutes = require('./chat.routes');
const adminRoutes = require('./admin.routes');
const teamRoutes = require('./team.routes');
const uploadRoutes = require('./upload.routes');
const metricsRoutes = require('./metrics.routes');

const router = express.Router();

/** GET /api/health — verifies the API is up and the database is reachable. */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let database = 'up';

    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }

    res.status(database === 'up' ? 200 : 503).json({
      success: database === 'up',
      data: {
        status: database === 'up' ? 'ok' : 'degraded',
        service: 'aurora-school-api',
        database,
        uptime: Math.round(process.uptime()),
      },
    });
  }),
);

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/staff', staffRoutes);
router.use('/', classRoutes); // /classes, /sections, /subjects, /assignments, /academic-years
router.use('/attendance', attendanceRoutes);
router.use('/exams', examRoutes);
router.use('/fees', feeRoutes);
router.use('/timetable', timetableRoutes);
router.use('/', noticeRoutes); // /notices/*, /events/*
router.use('/library', libraryRoutes);
router.use('/transport', transportRoutes);
router.use('/', schoolRoutes); // /settings/public, /admin/settings
router.use('/portal', portalRoutes);
router.use('/teacher', teacherRoutes);
router.use('/chat', chatRoutes);
router.use('/admin/users', teamRoutes);
router.use('/admin/uploads', uploadRoutes);
router.use('/admin', adminRoutes); // /admin/stats
router.use('/metrics', metricsRoutes);

module.exports = router;
