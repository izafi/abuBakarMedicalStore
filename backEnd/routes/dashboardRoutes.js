const express = require('express');
const {
  getDashboardSummary,
  getDashboardSalesChart,
  getDashboardPurchasesChart,
  getDashboardStockByCategory,
  getDashboardRecentSales,
  getDashboardAlerts,
  getDashboardRecentActivities,
  getDashboardData,
} = require('../controller/dashboardController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

// Dashboard Sub-Endpoints
router.get('/summary', getDashboardSummary);
router.get('/sales-chart', getDashboardSalesChart);
router.get('/purchases-chart', getDashboardPurchasesChart);
router.get('/stock-by-category', getDashboardStockByCategory);
router.get('/recent-sales', getDashboardRecentSales);
router.get('/alerts', getDashboardAlerts);
router.get('/recent-activities', getDashboardRecentActivities);

// Master Combined Endpoint
router.get('/', getDashboardData);

module.exports = router;
