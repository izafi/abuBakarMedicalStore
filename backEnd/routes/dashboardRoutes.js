const express = require('express');
const { getDashboardData } = require('../controller/dashboardController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, getDashboardData);

module.exports = router;
