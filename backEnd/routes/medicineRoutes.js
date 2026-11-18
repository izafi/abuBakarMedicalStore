const express = require('express');
const {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controller/medicineController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Allow public/optionalAuth viewing for Medicine Counter, require auth for CRUD
router.get('/', optionalAuth, getMedicines);
router.get('/:id', optionalAuth, getMedicineById);

// Protected mutation routes
router.post('/', authenticate, checkPermission('medicines', 'add'), createMedicine);
router.put('/:id', authenticate, checkPermission('medicines', 'edit'), updateMedicine);
router.delete('/:id', authenticate, checkPermission('medicines', 'delete'), deleteMedicine);

module.exports = router;
