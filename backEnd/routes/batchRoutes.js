const express = require('express');
const {
  getBatches,
  getBatchesByMedicine,
  getNearExpiryBatches,
  getExpiredBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
} = require('../controller/batchController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const {
  validateCreateBatch,
  validateUpdateBatch,
} = require('../middleware/validator');

const router = express.Router();

// Specific sub-paths mounted BEFORE /:id
router.get('/near-expiry', optionalAuth, getNearExpiryBatches);
router.get('/expired', optionalAuth, getExpiredBatches);
router.get('/medicine/:medicineId', optionalAuth, getBatchesByMedicine);

// Core Batch Endpoints
router.get('/', optionalAuth, getBatches);
router.get('/:id', optionalAuth, getBatchById);

// Protected Mutation Endpoints
router.post(
  '/',
  authenticate,
  checkPermission('inventory', 'add'),
  validateCreateBatch,
  createBatch
);

router.put(
  '/:id',
  authenticate,
  checkPermission('inventory', 'edit'),
  validateUpdateBatch,
  updateBatch
);

router.delete(
  '/:id',
  authenticate,
  checkPermission('inventory', 'delete'),
  deleteBatch
);

module.exports = router;
