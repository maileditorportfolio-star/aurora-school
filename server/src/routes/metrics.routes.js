const express = require('express');
const metricsController = require('../controllers/metrics.controller');

const router = express.Router();

/** GET /api/metrics — process and catalogue metrics for observability. */
router.get('/', metricsController.metrics);

module.exports = router;
