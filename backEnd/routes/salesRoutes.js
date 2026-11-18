const express = require('express');
const {
  checkoutSale,
  getSales,
  getSaleById,
} = require('../controller/salesController');
const { authenticate } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', checkPermission('sales', 'view'), getSales);
router.get('/:id', checkPermission('sales', 'view'), getSaleById);
router.post('/checkout', checkPermission('sales', 'add'), checkoutSale);

module.exports = router;
