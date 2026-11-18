const express = require('express');
const {
  getSettings,
  updateSettings,
  resetDemoData,
} = require('../controller/settingsController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/', optionalAuth, getSettings);
router.put('/', authenticate, requireAdmin, updateSettings);
router.post('/reset-demo-data', authenticate, requireAdmin, resetDemoData);

module.exports = router;
