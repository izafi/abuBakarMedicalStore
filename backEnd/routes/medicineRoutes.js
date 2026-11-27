const express = require('express');
const {
  getMedicines,
  getMedicineById,
  getCategories,
  getTypes,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} = require('../controller/medicineController');
const {
  searchCounterMedicines,
  getMedicineCounterDetails,
  getAvailableBatches,
  getCounterCatalog,
} = require('../controller/medicineCounterController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission, requireAdmin } = require('../middleware/permissionMiddleware');
const {
  validateCreateMedicine,
  validateUpdateMedicine,
} = require('../middleware/validator');

const router = express.Router();

// 1. Medicine Counter & Sub-path Endpoints (Mounted BEFORE /:id)
router.get('/counter/catalog', optionalAuth, getCounterCatalog);
router.get('/search', optionalAuth, searchCounterMedicines);
router.get('/categories', optionalAuth, getCategories);
router.get('/types', optionalAuth, getTypes);

// 2. Medicine Details & Batch Selection for POS Counter
router.get('/:id/details', optionalAuth, getMedicineCounterDetails);
router.get('/:id/available-batches', optionalAuth, getAvailableBatches);

// 3. Core Medicine Endpoints
router.get('/', optionalAuth, getMedicines);
router.get('/:id', optionalAuth, getMedicineById);

// 4. Protected Mutation Endpoints
router.post(
  '/',
  authenticate,
  checkPermission('medicines', 'add'),
  validateCreateMedicine,
  createMedicine
);

router.put(
  '/:id',
  authenticate,
  checkPermission('medicines', 'edit'),
  validateUpdateMedicine,
  updateMedicine
);

router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  deleteMedicine
);

module.exports = router;
