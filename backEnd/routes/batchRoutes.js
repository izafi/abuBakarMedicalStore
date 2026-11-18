const express = require('express');
const {
  getBatches,
  getBatchesByMedicine,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
} = require('../controller/batchController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.get('/', optionalAuth, getBatches);
router.get('/medicine/:medicineId', optionalAuth, getBatchesByMedicine);
router.get('/:id', optionalAuth, getBatchById);

router.post('/', authenticate, checkPermission('inventory', 'add'), createBatch);
router.put('/:id', authenticate, checkPermission('inventory', 'edit'), updateBatch);
router.delete('/:id', authenticate, checkPermission('inventory', 'delete'), deleteBatch);

module.exports = router;
