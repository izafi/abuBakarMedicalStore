const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Invoice = require('../models/Invoice');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Build standard date range query
 */
const buildDateFilter = (dateRange, startDate, endDate) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange && dateRange !== 'all') {
    if (dateRange === 'today') {
      return { $gte: todayStart };
    } else if (dateRange === 'yesterday') {
      const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      return { $gte: yestStart, $lt: todayStart };
    } else if (dateRange === 'week' || dateRange === '7days') {
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { $gte: weekStart };
    } else if (dateRange === 'month' || dateRange === '30days' || dateRange === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { $gte: monthStart };
    } else if (dateRange === 'year' || dateRange === 'this_year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { $gte: yearStart };
    }
  }

  if (startDate || endDate) {
    const range = {};
    if (startDate) range.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    return range;
  }

  return null;
};

/**
 * @desc    Get complete sales history with filters, search, metrics, and pagination
 * @route   GET /api/v1/sales/history
 * @access  Private ('sales.view')
 */
const getSalesHistory = asyncHandler(async (req, res) => {
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
    sortBy = 'saleDateTime',
    sortOrder = 'desc',
  } = req.query;

  const filter = {};

  // 1. Search (invoice number, patient name, doctor name, medicine, batch)
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

  // 2. Filter by employee
  if (employee && employee !== 'all') {
    filter.$or = [
      { employeeName: { $regex: new RegExp(`^${employee.trim()}$`, 'i') } },
      { employeeUsername: { $regex: new RegExp(`^${employee.trim()}$`, 'i') } },
      { employeeId: employee.trim() },
    ];
  }
  if (employeeId && employeeId !== 'all') {
    filter.employeeId = employeeId.trim();
  }

  // 3. Filter by payment method
  if (paymentMethod && paymentMethod !== 'all') {
    filter.paymentMethod = paymentMethod;
  }

  // 4. Filter by status
  if (status && status !== 'all') {
    filter.status = status;
  }

  // 5. Filter by date range
  const dateQuery = buildDateFilter(dateRange, startDate, endDate);
  if (dateQuery) {
    filter.saleDateTime = dateQuery;
  }

  // Sorting
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDirection };

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const isPaginationRequested = limit !== undefined && limit !== 'all' && parseInt(limit, 10) > 0;
  const limitNum = isPaginationRequested ? parseInt(limit, 10) : 0;

  const total = await Sale.countDocuments(filter);

  // Compute aggregate statistics for the filtered dataset
  const aggregateStats = await Sale.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$finalAmount' },
        totalSubtotal: { $sum: '$subtotal' },
        totalDiscount: { $sum: '$totalDiscount' },
        cashRevenue: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'Cash'] }, '$finalAmount', 0] },
        },
        cardRevenue: {
          $sum: { $cond: [{ $eq: ['$paymentMethod', 'Card'] }, '$finalAmount', 0] },
        },
        totalCount: { $sum: 1 },
      },
    },
  ]);

  const summary = aggregateStats[0] || {
    totalRevenue: 0,
    totalSubtotal: 0,
    totalDiscount: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    totalCount: total,
  };

  let query = Sale.find(filter).sort(sort);
  if (isPaginationRequested) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const sales = await query.exec();

  return res.status(200).json({
    success: true,
    message: 'Sales history retrieved successfully',
    data: sales,
    summary: {
      totalSales: total,
      totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
      totalSubtotal: Math.round(summary.totalSubtotal * 100) / 100,
      totalDiscount: Math.round(summary.totalDiscount * 100) / 100,
      cashRevenue: Math.round(summary.cashRevenue * 100) / 100,
      cardRevenue: Math.round(summary.cardRevenue * 100) / 100,
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
 * @desc    Dedicated instant search endpoint for sales history
 * @route   GET /api/v1/sales/history/search
 * @access  Private ('sales.view')
 */
const searchSalesHistory = asyncHandler(async (req, res) => {
  const { q, search, limit = 20 } = req.query;
  const term = (q || search || '').trim();

  if (!term) {
    return ApiResponse.error(res, 'Search term cannot be empty', ['Query parameter required'], 400);
  }

  const qRegex = { $regex: term, $options: 'i' };
  const filter = {
    $or: [
      { invoiceNumber: qRegex },
      { patientName: qRegex },
      { doctorName: qRegex },
      { employeeName: qRegex },
      { prescriptionRef: qRegex },
      { 'items.medicineName': qRegex },
      { 'items.batchNumber': qRegex },
    ],
  };

  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const results = await Sale.find(filter).sort({ saleDateTime: -1 }).limit(limitNum);

  return ApiResponse.success(res, `Found ${results.length} sales matching '${term}'`, {
    results,
    count: results.length,
    searchTerm: term,
  });
});

/**
 * @desc    Get sales history conducted today with real-time totals
 * @route   GET /api/v1/sales/history/today
 * @access  Private ('sales.view')
 */
const getTodaySalesHistory = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const filter = {
    $or: [{ saleDateTime: { $gte: startOfToday } }, { date: { $gte: startOfToday } }],
  };

  const salesToday = await Sale.find(filter).sort({ saleDateTime: -1 });

  let totalRevenue = 0;
  let totalDiscount = 0;
  let cashRevenue = 0;
  let cardRevenue = 0;

  for (const s of salesToday) {
    totalRevenue += s.finalAmount || 0;
    totalDiscount += s.totalDiscount || 0;
    if (s.paymentMethod === 'Cash') cashRevenue += s.finalAmount || 0;
    if (s.paymentMethod === 'Card') cardRevenue += s.finalAmount || 0;
  }

  return ApiResponse.success(res, "Today's sales history retrieved successfully", {
    sales: salesToday,
    count: salesToday.length,
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      cashRevenue: Math.round(cashRevenue * 100) / 100,
      cardRevenue: Math.round(cardRevenue * 100) / 100,
      count: salesToday.length,
    },
  });
});

/**
 * @desc    Get detailed history and invoice details for a specific completed sale
 * @route   GET /api/v1/sales/history/:id
 * @access  Private ('sales.view')
 */
const getSaleHistoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isObjectId = mongoose.Types.ObjectId.isValid(id);

  const query = isObjectId ? { $or: [{ _id: id }, { invoiceNumber: id }] } : { invoiceNumber: id };

  const sale = await Sale.findOne(query);
  if (!sale) {
    return ApiResponse.error(res, `Sale history record '${id}' not found`, ['No matching sale found'], 404);
  }

  // Populate discrete SaleItem records
  const discreteItems = await SaleItem.find({ saleId: sale._id });

  // Locate associated official Invoice
  const invoice = await Invoice.findOne({
    $or: [{ saleId: sale._id }, { invoiceNumber: sale.invoiceNumber }],
  });

  return ApiResponse.success(res, 'Sale history detail retrieved successfully', {
    sale,
    saleItems: discreteItems.length > 0 ? discreteItems : sale.items,
    invoice,
  });
});

/**
 * @desc    Block direct editing or modification of completed sales
 * @route   PUT /api/v1/sales/:id, PATCH /api/v1/sales/:id
 * @access  Private (Blocked by Business Rule)
 */
const blockDirectSaleModification = asyncHandler(async (req, res) => {
  return ApiResponse.error(
    res,
    'Modification Prohibited: Completed sales records cannot be edited directly. Pharmacy regulatory compliance requires using an authorized correction, return, or refund workflow.',
    ['Editing completed sales is not permitted'],
    400
  );
});

/**
 * @desc    Block direct deletion of completed sales
 * @route   DELETE /api/v1/sales/:id
 * @access  Private (Blocked by Business Rule)
 */
const blockDirectSaleDeletion = asyncHandler(async (req, res) => {
  return ApiResponse.error(
    res,
    'Deletion Prohibited: Completed sales and audit histories cannot be deleted. Any inventory adjustment must be processed through an authorized refund or stock reconciliation record.',
    ['Direct deletion of sales records is prohibited'],
    400
  );
});

module.exports = {
  getSalesHistory,
  searchSalesHistory,
  getTodaySalesHistory,
  getSaleHistoryById,
  blockDirectSaleModification,
  blockDirectSaleDeletion,
};
