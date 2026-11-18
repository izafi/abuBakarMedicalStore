const express = require('express');
const {
  getInventoryDashboard,
  adjustStock,
  getStockHistory,
  getCategories,
} = require('../controller/inventoryController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/dashboard', optionalAuth, getInventoryDashboard);
router.get('/categories', getCategories);
router.get('/stock-history', authenticate, checkPermission('inventory', 'view'), getStockHistory);
router.post('/adjust-stock', authenticate, checkPermission('inventory', 'edit'), adjustStock);

module.exports = router;
