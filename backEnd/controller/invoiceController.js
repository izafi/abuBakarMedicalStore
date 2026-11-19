const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Sale = require('../models/Sale');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Retrieve Store Settings for Invoice Header / Printing
 */
const getStoreSettings = async () => {
  const settings = await Settings.findOne();
  return (
    settings || {
      storeName: 'Abu Bakar Medical Store',
      branchName: 'Main Branch',
      tagline: 'PHARMACY INVENTORY SYSTEM',
      address: 'Main Bazar, Medical Market, Pakistan',
      phone: '+92 300 1234567',
      email: 'info@abubakarmedical.pk',
      licenseNumber: 'PB-LHR-2026-99042',
      currency: 'Rs',
      currencySymbol: 'Rs.',
    }
  );
};

/**
 * Helper: Format Invoice Document with Store Metadata
 */
const formatInvoiceResponse = (invoiceDoc, storeSettings) => {
  const inv = invoiceDoc.toObject ? invoiceDoc.toObject() : invoiceDoc;
  return {
    ...inv,
    store: {
      name: storeSettings.storeName,
      branchName: storeSettings.branchName || 'Main Branch',
      tagline: storeSettings.tagline,
      address: storeSettings.address,
      phone: storeSettings.phone,
      email: storeSettings.email,
      licenseNumber: storeSettings.licenseNumber,
      currency: storeSettings.currency || 'Rs',
      currencySymbol: storeSettings.currencySymbol || 'Rs.',
    },
  };
};

/**
 * Helper: Ensure an existing historical Sale has an Invoice document
 */
const ensureInvoiceForSale = async (sale) => {
  if (!sale) return null;
  let invoice = await Invoice.findOne({
    $or: [{ saleId: sale._id }, { invoiceNumber: sale.invoiceNumber }],
  });

  if (!invoice) {
    invoice = await Invoice.create({
      saleId: sale._id,
      invoiceNumber: sale.invoiceNumber,
      invoiceDate: sale.saleDateTime || sale.date || new Date(),
      patientName: sale.patientName,
      doctorName: sale.doctorName,
      prescription: sale.prescription || sale.prescriptionDescription || 'N/A',
      prescriptionRef: sale.prescriptionRef || sale.prescriptionReferenceNumber || 'N/A',
      employeeId: sale.employeeId,
      employeeName: sale.employeeName,
      employeeUsername: sale.employeeUsername || '',
      subtotal: sale.subtotal,
      discount: sale.totalDiscount || sale.discountAmount || 0,
      totalDiscount: sale.totalDiscount || sale.discountAmount || 0,
      grandTotal: sale.finalAmount || sale.grandTotal,
      finalAmount: sale.finalAmount || sale.grandTotal,
      paymentMethod: sale.paymentMethod || 'Cash',
      amountReceived: sale.amountReceived || 0,
      changeReturned: sale.changeReturned || 0,
      status: 'Paid',
      items: sale.items || [],
    });
  }
  return invoice;
};

/**
 * @desc    Get all invoices with filtering, search, and pagination
 * @route   GET /api/v1/invoices
 * @access  Private ('sales.view')
 */
const getInvoices = asyncHandler(async (req, res) => {
  const {
    search,
    q,
    employee,
    employeeId,
    paymentMethod,
    status,
    dateRange,
    startDate,
    endDate,
    page = 1,
    limit,
    sortBy = 'invoiceDate',
    sortOrder = 'desc',
  } = req.query;

  const filter = {};

  // 1. Text Search (invoiceNumber, patientName, doctorName, employeeName)
  const queryStr = (search || q || '').trim();
  if (queryStr) {
    const qRegex = { $regex: queryStr, $options: 'i' };
    filter.$or = [
      { invoiceNumber: qRegex },
      { patientName: qRegex },
      { doctorName: qRegex },
      { employeeName: qRegex },
      { prescriptionRef: qRegex },
      { 'items.medicineName': qRegex },
      { 'items.batchNumber': qRegex },
    ];
  }

  // 2. Employee filter
  if (employee && employee !== 'all') {
    filter.$or = [
      { employeeName: { $regex: new RegExp(`^${employee.trim()}$`, 'i') } },
      { employeeId: employee.trim() },
    ];
  }
  if (employeeId && employeeId !== 'all') {
    filter.employeeId = employeeId.trim();
  }

  // 3. Payment Method filter
  if (paymentMethod && paymentMethod !== 'all') {
    filter.paymentMethod = paymentMethod;
  }

  // 4. Status filter
  if (status && status !== 'all') {
    filter.status = status;
  }

  // 5. Date filters
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange && dateRange !== 'all') {
    if (dateRange === 'today') {
      filter.invoiceDate = { $gte: todayStart };
    } else if (dateRange === 'yesterday') {
      const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      filter.invoiceDate = { $gte: yestStart, $lt: todayStart };
    } else if (dateRange === 'week' || dateRange === '7days') {
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      filter.invoiceDate = { $gte: weekStart };
    } else if (dateRange === 'month' || dateRange === '30days' || dateRange === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.invoiceDate = { $gte: monthStart };
    }
  } else if (startDate || endDate) {
    filter.invoiceDate = {};
    if (startDate) filter.invoiceDate.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.invoiceDate.$lte = end;
    }
  }

  // Sorting
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const isPaginationRequested = limit !== undefined && limit !== 'all' && parseInt(limit, 10) > 0;
  const limitNum = isPaginationRequested ? parseInt(limit, 10) : 0;

  const total = await Invoice.countDocuments(filter);

  let query = Invoice.find(filter).sort(sort);
  if (isPaginationRequested) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const invoices = await query.exec();
  const store = await getStoreSettings();

  return res.status(200).json({
    success: true,
    message: 'Invoices retrieved successfully',
    data: invoices,
    store: {
      name: store.storeName,
      address: store.address,
      phone: store.phone,
    },
    pagination: {
      total,
      page: pageNum,
      limit: isPaginationRequested ? limitNum : total,
      pages: isPaginationRequested ? Math.ceil(total / limitNum) || 1 : 1,
    },
  });
});

/**
 * @desc    Get invoice by internal ID or invoiceNumber
 * @route   GET /api/v1/invoices/:id
 * @access  Private / Public
 */
const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let invoice = null;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  if (isObjectId) {
    invoice = await Invoice.findById(id).populate('saleId');
  }

  // If not found by ObjectId, try by invoiceNumber
  if (!invoice) {
    invoice = await Invoice.findOne({ invoiceNumber: id.trim().toUpperCase() });
  }

  // Fallback: If not in Invoice model, look in Sale model and ensure synced
  if (!invoice) {
    const saleQuery = isObjectId ? { $or: [{ _id: id }, { invoiceNumber: id }] } : { invoiceNumber: id };
    const sale = await Sale.findOne(saleQuery);
    if (sale) {
      invoice = await ensureInvoiceForSale(sale);
    }
  }

  if (!invoice) {
    return ApiResponse.error(res, `Invoice '${id}' not found`, ['No matching invoice record found'], 404);
  }

  const store = await getStoreSettings();
  return ApiResponse.success(res, 'Invoice details retrieved successfully', formatInvoiceResponse(invoice, store));
});

/**
 * @desc    Get invoice by exact invoiceNumber
 * @route   GET /api/v1/invoices/number/:invoiceNumber
 * @access  Private / Public
 */
const getInvoiceByNumber = asyncHandler(async (req, res) => {
  const invNumber = req.params.invoiceNumber.trim().toUpperCase();

  let invoice = await Invoice.findOne({ invoiceNumber: invNumber }).populate('saleId');

  // Fallback check against Sale collection
  if (!invoice) {
    const sale = await Sale.findOne({ invoiceNumber: invNumber });
    if (sale) {
      invoice = await ensureInvoiceForSale(sale);
    }
  }

  if (!invoice) {
    return ApiResponse.error(
      res,
      `Invoice #${invNumber} not found`,
      [`No invoice found with number: ${invNumber}`],
      404
    );
  }

  const store = await getStoreSettings();
  return ApiResponse.success(res, 'Invoice retrieved successfully', formatInvoiceResponse(invoice, store));
});

/**
 * @desc    Get invoice by saleId
 * @route   GET /api/v1/invoices/sale/:saleId
 * @access  Private / Public
 */
const getInvoiceBySaleId = asyncHandler(async (req, res) => {
  const { saleId } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(saleId);
  let invoice = null;

  if (isObjectId) {
    invoice = await Invoice.findOne({ saleId });
  }

  if (!invoice) {
    const sale = await Sale.findOne(isObjectId ? { _id: saleId } : { invoiceNumber: saleId });
    if (sale) {
      invoice = await ensureInvoiceForSale(sale);
    }
  }

  if (!invoice) {
    return ApiResponse.error(
      res,
      `No invoice associated with sale ID '${saleId}'`,
      ['Sale ID not found or invoice not generated'],
      404
    );
  }

  const store = await getStoreSettings();
  return ApiResponse.success(res, 'Invoice retrieved by saleId', formatInvoiceResponse(invoice, store));
});

/**
 * @desc    Get recent invoices
 * @route   GET /api/v1/invoices/recent
 * @access  Private / Public
 */
const getRecentInvoices = asyncHandler(async (req, res) => {
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 5);
  let recentInvoices = await Invoice.find().sort({ invoiceDate: -1 }).limit(limit);

  // If Invoice collection empty, populate from Sale
  if (recentInvoices.length === 0) {
    const recentSales = await Sale.find().sort({ saleDateTime: -1 }).limit(limit);
    for (const sale of recentSales) {
      await ensureInvoiceForSale(sale);
    }
    recentInvoices = await Invoice.find().sort({ invoiceDate: -1 }).limit(limit);
  }

  const store = await getStoreSettings();
  const formatted = recentInvoices.map((inv) => formatInvoiceResponse(inv, store));

  return ApiResponse.success(res, 'Recent invoices retrieved', formatted);
});

module.exports = {
  getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  getInvoiceBySaleId,
  getRecentInvoices,
};
