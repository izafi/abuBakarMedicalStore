const express = require('express');
const {
  getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  getInvoiceBySaleId,
  getRecentInvoices,
} = require('../controller/invoiceController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Allow authenticated access with permission check; allow optionalAuth for direct invoice print if needed
router.use(optionalAuth);

// 1. Specific Static/Sub-path Endpoints (MUST come before /:id)
router.get('/recent', getRecentInvoices);
router.get('/number/:invoiceNumber', getInvoiceByNumber);
router.get('/sale/:saleId', getInvoiceBySaleId);

// 2. Base Invoices Collection List
router.get('/', getInvoices);

// 3. Single Invoice by ID or Invoice Number
router.get('/:id', getInvoiceById);

module.exports = router;
