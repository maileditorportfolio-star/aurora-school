const express = require('express');
const notices = require('../controllers/notices.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Public endpoints for the landing page.
router.get('/notices/public', notices.publicList);
router.get('/events/public', notices.publicEvents);

// Management endpoints (staff only).
router.get('/notices', requireAuth, requireAdmin, notices.list);
router.post('/notices', requireAuth, requirePermission('notices.write'), notices.create);
router.patch('/notices/:id', requireAuth, requirePermission('notices.write'), notices.update);
router.delete('/notices/:id', requireAuth, requirePermission('notices.write'), notices.remove);

router.get('/events', requireAuth, requireAdmin, notices.listEvents);
router.post('/events', requireAuth, requirePermission('notices.write'), notices.createEvent);
router.patch('/events/:id', requireAuth, requirePermission('notices.write'), notices.updateEvent);
router.delete('/events/:id', requireAuth, requirePermission('notices.write'), notices.removeEvent);

module.exports = router;
