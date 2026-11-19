const express = require('express');
const {
  getSettings,
  updateSettings,
  updateStoreSettings,
  updateInventorySettings,
  resetDemoData,
} = require('../controller/settingsController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');

const router = express.Router();

// 1. Get store settings
router.get('/', optionalAuth, getSettings);

// 2. Full settings update (Admin only)
router.put('/', authenticate, requireAdmin, updateSettings);

// 3. Patch store profile & branch details (Admin only)
router.patch('/store', authenticate, requireAdmin, updateStoreSettings);

// 4. Patch inventory thresholds (Admin only)
router.patch('/inventory', authenticate, requireAdmin, updateInventorySettings);

// 5. Reset demo data (Admin only)
router.post('/reset-demo-data', authenticate, requireAdmin, resetDemoData);

module.exports = router;
