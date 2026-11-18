const express = require('express');
const {
  getInvoiceByNumber,
  getRecentInvoices,
} = require('../controller/invoiceController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(optionalAuth);

router.get('/recent', getRecentInvoices);
router.get('/:invoiceNumber', getInvoiceByNumber);

module.exports = router;
