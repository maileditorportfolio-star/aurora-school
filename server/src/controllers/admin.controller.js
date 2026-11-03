const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isoDay = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** GET /api/admin/stats — dashboard composite. */
const stats = asyncHandler(async (_req, res) => {
  const today = startOfDay(new Date());
  const since14 = startOfDay(new Date(Date.now() - 13 * 24 * 60 * 60 * 1000));
  const since180 = startOfDay(new Date(Date.now() - 179 * 24 * 60 * 60 * 1000));

  const [students, staff, classes, sections] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'TEACHER' } }),
    prisma.schoolClass.count(),
    prisma.section.count(),
  ]);

  const todaysAttendance = await prisma.attendance.findMany({
    where: { date: today },
    select: { status: true },
  });
  const presentToday = todaysAttendance.filter(
    (row) => row.status === 'PRESENT' || row.status === 'LATE',
  ).length;
  const attendanceRate = todaysAttendance.length
    ? Math.round((presentToday / todaysAttendance.length) * 100)
    : 0;

  const outstandingRows = await prisma.feeInvoice.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    select: { amount: true, paidAmount: true, studentId: true },
  });
  const billed = await prisma.feeInvoice.aggregate({ _sum: { amount: true } });
  const collectedAgg = await prisma.feeInvoice.aggregate({ _sum: { paidAmount: true } });
  const outstanding = outstandingRows.reduce((sum, row) => sum + (row.amount - row.paidAmount), 0);

  const defaulterMap = new Map();
  outstandingRows.forEach((row) => {
    defaulterMap.set(
      row.studentId,
      (defaulterMap.get(row.studentId) || 0) + (row.amount - row.paidAmount),
    );
  });
  const defaulterIds = [...defaulterMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const defaulterStudents = defaulterIds.length
    ? await prisma.student.findMany({
        where: { id: { in: defaulterIds.map(([id]) => id) } },
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      })
    : [];
  const topDefaulters = defaulterIds.map(([id, due]) => {
    const student = defaulterStudents.find((row) => row.id === id);
    return {
      studentId: id,
      name: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
      admissionNo: student?.admissionNo || '',
      due,
    };
  });

  const trendRows = await prisma.$queryRaw`
    SELECT DATE(date) AS day,
           SUM(CASE WHEN status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) AS present,
           COUNT(*) AS total
    FROM attendance
    WHERE date >= ${since14}
    GROUP BY DATE(date)
    ORDER BY day ASC
  `;
  const attendanceTrend = (trendRows || []).map((row) => ({
    date: isoDay(row.day),
    present: Number(row.present),
    total: Number(row.total),
  }));

  const collectionRows = await prisma.$queryRaw`
    SELECT DATE_FORMAT(createdAt, '%Y-%m') AS month, SUM(amount) AS collected
    FROM payments
    WHERE createdAt >= ${since180}
    GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
    ORDER BY month ASC
  `;
  const collectionsByMonth = (collectionRows || []).map((row) => ({
    month: String(row.month),
    collected: Number(row.collected),
  }));

  const sectionsWithCounts = await prisma.section.findMany({
    include: {
      schoolClass: true,
      _count: { select: { students: { where: { status: 'ACTIVE' } } } },
    },
  });
  const strengthMap = new Map();
  sectionsWithCounts.forEach((section) => {
    const name = section.schoolClass?.name || 'Unassigned';
    strengthMap.set(name, (strengthMap.get(name) || 0) + section._count.students);
  });
  const classStrength = [...strengthMap.entries()]
    .map(([name, count]) => ({ name, students: count }))
    .sort((a, b) => b.students - a.students);

  res.json({
    success: true,
    data: {
      totals: {
        students,
        staff,
        classes,
        sections,
        billed: billed._sum.amount || 0,
        collected: collectedAgg._sum.paidAmount || 0,
        outstanding,
        presentToday,
        attendanceRate,
      },
      attendanceTrend,
      collectionsByMonth,
      classStrength,
      topDefaulters,
    },
  });
});

module.exports = { stats };
