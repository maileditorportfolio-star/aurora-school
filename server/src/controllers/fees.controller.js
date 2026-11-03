const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  feeStructureSchema,
  invoiceGenerateSchema,
  paymentSchema,
  parse,
} = require('../validation/schemas');

const invoiceInclude = {
  student: { include: { section: { include: { schoolClass: true } } } },
  structure: true,
  payments: { orderBy: { createdAt: 'desc' } },
};

const withOverdue = (invoice) => ({
  ...invoice,
  isOverdue:
    invoice.status !== 'PAID' &&
    invoice.status !== 'WAIVED' &&
    new Date(invoice.dueDate) < new Date(),
});

const statusFor = (paidAmount, amount) => {
  if (paidAmount <= 0) return 'PENDING';
  if (paidAmount >= amount) return 'PAID';
  return 'PARTIAL';
};

// ---------- Fee structures ----------

/** GET /api/fees/structures */
const listStructures = asyncHandler(async (_req, res) => {
  const structures = await prisma.feeStructure.findMany({
    orderBy: [{ frequency: 'asc' }, { name: 'asc' }],
    include: { schoolClass: true, academicYear: true, _count: { select: { invoices: true } } },
  });
  res.json({ success: true, data: { structures } });
});

/** POST /api/fees/structures */
const createStructure = asyncHandler(async (req, res) => {
  const data = parse(feeStructureSchema, req.body);
  const structure = await prisma.feeStructure.create({
    data: { ...data, classId: data.classId || null, academicYearId: data.academicYearId || null },
  });
  res.status(201).json({ success: true, data: { structure } });
});

/** PATCH /api/fees/structures/:id */
const updateStructure = asyncHandler(async (req, res) => {
  const data = parse(feeStructureSchema.partial(), req.body);
  const structure = await prisma.feeStructure.update({
    where: { id: req.params.id },
    data: {
      ...data,
      classId: data.classId === '' ? null : data.classId,
      academicYearId: data.academicYearId === '' ? null : data.academicYearId,
    },
  });
  res.json({ success: true, data: { structure } });
});

/** DELETE /api/fees/structures/:id */
const removeStructure = asyncHandler(async (req, res) => {
  await prisma.feeStructure.delete({ where: { id: req.params.id } });
  res.json({ success: true, data: { id: req.params.id } });
});

// ---------- Invoices ----------

/** GET /api/fees/invoices?studentId=&status=&sectionId=&page=&limit= */
const listInvoices = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const where = {};
  if (req.query.studentId) where.studentId = String(req.query.studentId);
  if (req.query.status) where.status = String(req.query.status);
  if (req.query.sectionId) where.student = { sectionId: String(req.query.sectionId) };

  const [total, invoices] = await Promise.all([
    prisma.feeInvoice.count({ where }),
    prisma.feeInvoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: {
      invoices: invoices.map(withOverdue),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
});

/** POST /api/fees/invoices — one-off invoice. */
const createInvoice = asyncHandler(async (req, res) => {
  const { studentId, title, amount, dueDate, month, year } = req.body || {};
  if (!studentId || !title || !amount || !dueDate) {
    throw ApiError.badRequest('studentId, title, amount and dueDate are required');
  }

  const student = await prisma.student.findUnique({ where: { id: String(studentId) } });
  if (!student) throw ApiError.notFound('Student not found');

  const count = await prisma.feeInvoice.count();
  const invoice = await prisma.feeInvoice.create({
    data: {
      invoiceNo: `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
      studentId: student.id,
      title: String(title).trim(),
      amount: Number(amount),
      dueDate: new Date(dueDate),
      month: month ? Number(month) : null,
      year: year ? Number(year) : null,
    },
    include: invoiceInclude,
  });

  res.status(201).json({ success: true, data: { invoice: withOverdue(invoice) } });
});

/** POST /api/fees/invoices/generate — bulk generation from a structure. */
const generateInvoices = asyncHandler(async (req, res) => {
  const { structureId, month, year, sectionId, dueDate } = parse(invoiceGenerateSchema, req.body);

  const structure = await prisma.feeStructure.findUnique({ where: { id: structureId } });
  if (!structure) throw ApiError.notFound('Fee structure not found');

  const effectiveMonth =
    structure.frequency === 'MONTHLY' ? month || new Date().getMonth() + 1 : null;
  const effectiveYear = structure.frequency === 'MONTHLY' ? year || new Date().getFullYear() : null;
  const now = new Date();
  const effectiveDueDate =
    dueDate ||
    new Date(
      effectiveYear || now.getFullYear(),
      effectiveMonth ? effectiveMonth - 1 : now.getMonth(),
      structure.dueDay || 10,
    );

  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      ...(sectionId
        ? { sectionId }
        : structure.classId
          ? { section: { classId: structure.classId } }
          : {}),
    },
    select: { id: true },
  });

  const existing = await prisma.feeInvoice.findMany({
    where: { structureId: structure.id, month: effectiveMonth, year: effectiveYear },
    select: { studentId: true },
  });
  const skip = new Set(existing.map((row) => row.studentId));
  const targets = students.filter((student) => !skip.has(student.id));

  const monthLabel = effectiveMonth ? ` (${effectiveMonth}/${effectiveYear})` : '';
  let created = 0;
  if (targets.length) {
    const baseCount = await prisma.feeInvoice.count();
    await prisma.feeInvoice.createMany({
      data: targets.map((student, index) => ({
        invoiceNo: `INV-${now.getFullYear()}-${String(baseCount + index + 1).padStart(5, '0')}`,
        studentId: student.id,
        structureId: structure.id,
        title: `${structure.name}${monthLabel}`,
        amount: structure.amount,
        dueDate: effectiveDueDate,
        month: effectiveMonth,
        year: effectiveYear,
      })),
    });
    created = targets.length;
  }

  res.status(201).json({
    success: true,
    data: { created, skipped: skip.size, total: students.length },
  });
});

/** POST /api/fees/invoices/:id/payments */
const addPayment = asyncHandler(async (req, res) => {
  const { amount, method, reference } = parse(paymentSchema, req.body);

  const invoice = await prisma.feeInvoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status === 'WAIVED') throw ApiError.badRequest('This invoice has been waived');

  const due = invoice.amount - invoice.paidAmount;
  if (amount > due) {
    throw ApiError.badRequest(`Amount exceeds the outstanding balance (${due.toFixed(2)})`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount,
        method,
        reference: reference || null,
        receivedById: req.user?.id || null,
      },
    });
    const paidAmount = invoice.paidAmount + amount;
    return tx.feeInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount, status: statusFor(paidAmount, invoice.amount) },
      include: invoiceInclude,
    });
  });

  res.status(201).json({ success: true, data: { invoice: withOverdue(updated) } });
});

/** POST /api/fees/invoices/:id/waive */
const waiveInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.feeInvoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice.status === 'PAID') throw ApiError.badRequest('Paid invoices cannot be waived');

  const updated = await prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: { status: 'WAIVED' },
    include: invoiceInclude,
  });
  res.json({ success: true, data: { invoice: withOverdue(updated) } });
});

/** DELETE /api/fees/invoices/:id */
const removeInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { payments: true } } },
  });
  if (!invoice) throw ApiError.notFound('Invoice not found');
  if (invoice._count.payments > 0)
    throw ApiError.conflict('Invoices with payments cannot be deleted');

  await prisma.feeInvoice.delete({ where: { id: invoice.id } });
  res.json({ success: true, data: { id: invoice.id } });
});

/** GET /api/fees/receipts/:paymentId — printable receipt payload. */
const receipt = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.paymentId },
    include: {
      invoice: { include: { student: true } },
      receivedBy: { select: { name: true } },
    },
  });
  if (!payment) throw ApiError.notFound('Receipt not found');

  res.json({ success: true, data: { receipt: payment } });
});

/** GET /api/fees/students/:studentId/summary */
const studentSummary = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: req.params.studentId } });
  if (!student) throw ApiError.notFound('Student not found');

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId: student.id },
    include: invoiceInclude,
    orderBy: { dueDate: 'desc' },
  });

  const billed = invoices.reduce((sum, row) => sum + row.amount, 0);
  const paid = invoices.reduce((sum, row) => sum + row.paidAmount, 0);
  const open = invoices.filter((row) => row.status !== 'PAID' && row.status !== 'WAIVED').length;

  res.json({
    success: true,
    data: {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNo: student.admissionNo,
      },
      totals: { billed, paid, due: billed - paid, open },
      invoices: invoices.map(withOverdue),
    },
  });
});

module.exports = {
  listStructures,
  createStructure,
  updateStructure,
  removeStructure,
  listInvoices,
  createInvoice,
  generateInvoices,
  addPayment,
  waiveInvoice,
  removeInvoice,
  receipt,
  studentSummary,
};
