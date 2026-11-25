const express = require('express');
const {
  createSale,
  checkoutSale,
  getSales,
  getTodaySales,
  getSalesSummary,
  getSaleById,
  returnSaleItem,
} = require('../controller/salesController');
const {
  getSalesHistory,
  searchSalesHistory,
  getTodaySalesHistory,
  getSaleHistoryById,
  blockDirectSaleModification,
  blockDirectSaleDeletion,
} = require('../controller/salesHistoryController');
const { authenticate } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);

// ==========================================
// 1. SALES HISTORY SUB-ROUTES
// ==========================================
// Specific history routes must precede /history/:id
router.get('/history/search', checkPermission('sales', 'view'), searchSalesHistory);
router.get('/history/today', checkPermission('sales', 'view'), getTodaySalesHistory);
router.get('/history/:id', checkPermission('sales', 'view'), getSaleHistoryById);
router.get('/history', checkPermission('sales', 'view'), getSalesHistory);

// ==========================================
// 2. SPECIFIC SUB-PATHS (BEFORE /:id)
// ==========================================
router.get('/today', checkPermission('sales', 'view'), getTodaySales);
router.get('/summary', checkPermission('sales', 'view'), getSalesSummary);

// ==========================================
// 3. CORE SALES ENDPOINTS
// ==========================================
router.get('/', checkPermission('sales', 'view'), getSales);
router.get('/:id', checkPermission('sales', 'view'), getSaleById);

// ==========================================
// 4. SALE CREATION & CHECKOUT
// ==========================================
router.post('/', checkPermission('sales', 'add'), createSale);
router.post('/checkout', checkPermission('sales', 'add'), checkoutSale);
router.post('/return-item', checkPermission('sales', 'add'), returnSaleItem);

// ==========================================
// 5. BLOCKED OPERATIONS (COMPLIANCE GUARDS)
// ==========================================
router.put('/:id', blockDirectSaleModification);
router.patch('/:id', blockDirectSaleModification);
router.delete('/:id', blockDirectSaleDeletion);

module.exports = router;
