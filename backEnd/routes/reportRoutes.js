const express = require('express');
const {
  getSalesReport,
  getRevenueReport,
  getBestSellingMedicinesReport,
  getInventoryReport,
  getStockHistoryReport,
  getCategoryReport,
  getGenericReport,
} = require('../controller/reportsController');
const { authenticate } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);

// 1. Specific Named Report Endpoints (MUST precede /:reportType)
router.get('/sales', checkPermission('reports', 'view'), getSalesReport);
router.get('/revenue', checkPermission('reports', 'view'), getRevenueReport);
router.get('/best-selling-medicines', checkPermission('reports', 'view'), getBestSellingMedicinesReport);
router.get('/inventory', checkPermission('reports', 'view'), getInventoryReport);
router.get('/stock-history', checkPermission('reports', 'view'), getStockHistoryReport);
router.get('/category', checkPermission('reports', 'view'), getCategoryReport);

// 2. Generic Parameterized Report Route (Supports legacy & additional types)
router.get('/:reportType', checkPermission('reports', 'view'), getGenericReport);

module.exports = router;
