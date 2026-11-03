const express = require('express');
const library = require('../controllers/library.controller');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/books', requireAdmin, library.listBooks);
router.post('/books', requirePermission('library.write'), library.createBook);
router.patch('/books/:id', requirePermission('library.write'), library.updateBook);
router.delete('/books/:id', requirePermission('library.write'), library.removeBook);

router.get('/issues', requireAdmin, library.listIssues);
router.post('/issues', requirePermission('library.write'), library.issueBook);
router.post('/issues/:id/return', requirePermission('library.write'), library.returnBook);
router.post('/issues/:id/lost', requirePermission('library.write'), library.markLost);

module.exports = router;
