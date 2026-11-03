const express = require('express');
const chatController = require('../controllers/chat.controller');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/:conversationId', chatController.history);
router.post('/', optionalAuth, chatController.create);

module.exports = router;
