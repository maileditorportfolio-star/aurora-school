const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

/** GET /api/metrics — lightweight observability snapshot (process + school). */
const metrics = asyncHandler(async (_req, res) => {
  const memory = process.memoryUsage();

  const [users, students, feeInvoices, notices] = await Promise.all([
    prisma.user.count(),
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.feeInvoice.count(),
    prisma.notice.count(),
  ]);

  res.json({
    success: true,
    data: {
      uptime: Math.round(process.uptime()),
      pid: process.pid,
      nodeVersion: process.version,
      memory: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      },
      school: { users, students, feeInvoices, notices },
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = { metrics };
