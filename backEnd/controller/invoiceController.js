const Sale = require('../models/Sale');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get complete printable invoice by invoiceNumber
 * @route   GET /api/v1/invoices/:invoiceNumber
 * @access  Public / Private
 */
const getInvoiceByNumber = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ invoiceNumber: req.params.invoiceNumber });
  if (!sale) {
    return ApiResponse.error(res, 'Invoice not found', ['No invoice with this number'], 404);
  }

  const settings = (await Settings.findOne()) || {
    storeName: 'Abu Bakar Medical Store',
    tagline: 'PHARMACY INVENTORY SYSTEM',
    address: 'Main Bazar, Medical Market, Pakistan',
    phone: '+92 300 1234567',
    licenseNumber: 'PB-LHR-2026-99042',
  };

  const invoice = {
    ...sale.toObject(),
    store: {
      name: settings.storeName,
      tagline: settings.tagline,
      address: settings.address,
      phone: settings.phone,
      licenseNumber: settings.licenseNumber,
    },
  };

  return ApiResponse.success(res, 'Invoice data retrieved', invoice);
});

/**
 * @desc    Get recent invoices
 * @route   GET /api/v1/invoices/recent
 * @access  Public / Private
 */
const getRecentInvoices = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const recentSales = await Sale.find().sort({ date: -1 }).limit(limit);

  return ApiResponse.success(res, 'Recent invoices retrieved', recentSales);
});

module.exports = {
  getInvoiceByNumber,
  getRecentInvoices,
};
