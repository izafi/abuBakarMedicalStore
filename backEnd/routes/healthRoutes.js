const express = require('express');
const { getHealthStatus } = require('../controller/healthController');

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    API Health Check & Database Status
 */
router.get('/', getHealthStatus);

module.exports = router;
