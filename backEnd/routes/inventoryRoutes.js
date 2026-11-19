const express = require('express');
const {
  getInventory,
  getInventorySummary,
  getLowStock,
  getOutOfStock,
  getNearExpiry,
  getExpired,
  addStock,
  removeStock,
  updateStock,
  getStockHistory,
  getStockHistoryByBatch,
  getCategories,
} = require('../controller/inventoryController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Specific sub-paths
router.get('/summary', optionalAuth, getInventorySummary);
router.get('/dashboard', optionalAuth, getInventorySummary); // Compatibility alias
router.get('/low-stock', optionalAuth, getLowStock);
router.get('/out-of-stock', optionalAuth, getOutOfStock);
router.get('/near-expiry', optionalAuth, getNearExpiry);
router.get('/expired', optionalAuth, getExpired);
router.get('/categories', optionalAuth, getCategories);

// Stock History Audit Logs
router.get('/history', authenticate, checkPermission('inventory', 'view'), getStockHistory);
router.get('/history/:batchId', authenticate, checkPermission('inventory', 'view'), getStockHistoryByBatch);
router.get('/stock-history', authenticate, checkPermission('inventory', 'view'), getStockHistory); // Compatibility alias

// Stock Mutation Operations
router.post('/add-stock', authenticate, checkPermission('inventory', 'edit'), addStock);
router.post('/remove-stock', authenticate, checkPermission('inventory', 'edit'), removeStock);
router.put('/update-stock', authenticate, checkPermission('inventory', 'edit'), updateStock);
router.post('/adjust-stock', authenticate, checkPermission('inventory', 'edit'), updateStock); // Compatibility alias

// Main Inventory Listing
router.get('/', optionalAuth, getInventory);

module.exports = router;
