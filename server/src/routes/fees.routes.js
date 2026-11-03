const express = require('express');
const fees = require('../controllers/fees.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/structures', requireAdmin, fees.listStructures);
router.post('/structures', requirePermission('fees.write'), fees.createStructure);
router.patch('/structures/:id', requirePermission('fees.write'), fees.updateStructure);
router.delete('/structures/:id', requirePermission('fees.write'), fees.removeStructure);

router.get('/invoices', requireAdmin, fees.listInvoices);
router.post('/invoices', requirePermission('fees.write'), fees.createInvoice);
router.post('/invoices/generate', requirePermission('fees.write'), fees.generateInvoices);
router.post('/invoices/:id/payments', requirePermission('fees.write'), fees.addPayment);
router.post('/invoices/:id/waive', requirePermission('fees.write'), fees.waiveInvoice);
router.delete('/invoices/:id', requirePermission('fees.write'), fees.removeInvoice);

router.get('/receipts/:paymentId', requireAdmin, fees.receipt);
router.get('/students/:studentId/summary', requireAdmin, fees.studentSummary);

module.exports = router;
