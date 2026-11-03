const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.security.authRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

// Public self-registration is disabled — accounts are provisioned by the school.
router.post('/login', authLimiter, authController.login);
router.get('/me', requireAuth, authController.me);
router.patch('/me', requireAuth, authController.updateProfile);
router.patch('/password', requireAuth, authController.changePassword);

module.exports = router;
