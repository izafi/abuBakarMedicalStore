const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Employee = require('../models/Employee');
const { processSale } = require('../services/saleService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new sale (Using Centralized processSale Service)
 * @route   POST /api/v1/sales
 * @access  Private ('sales.add')
 */
const createSale = asyncHandler(async (req, res) => {
  if (req.user?.status && req.user.status !== 'Active') {
    return ApiResponse.error(
      res,
      'Employee account is inactive. Inactive employees cannot create sales.',
      ['Account is inactive'],
      403
    );
  }

  const sale = await processSale({
    saleData: req.body,
    user: req.user,
  });

  return ApiResponse.created(res, `Sale completed & Invoice #${sale.invoiceNumber} generated`, sale);
});

/**
 * @desc    Process Checkout (Mandatory Counter Three-Step Verification)
 * @route   POST /api/v1/sales/checkout
 * @access  Private ('sales.add')
 */
const checkoutSale = asyncHandler(async (req, res) => {
  // Reject inactive employees immediately
  if (req.user?.status && req.user.status !== 'Active') {
    return ApiResponse.error(
      res,
      'Employee account is inactive. Inactive employees cannot authorize checkout.',
      ['Account is inactive'],
      403
    );
  }

  // STEP 1: PATIENT INFORMATION VALIDATION
  const patientSource = req.body.patientInfo || req.body.patient || req.body;
  const patientName = (patientSource.patientName || patientSource.customerName || req.body.patientName || '').trim();
  const doctorName = (patientSource.doctorName || req.body.doctorName || '').trim();
  const prescription = (
    patientSource.prescription ||
    patientSource.prescriptionDescription ||
    req.body.prescription ||
    req.body.prescriptionDescription ||
    ''
  ).trim();
  const prescriptionRef = (
    patientSource.prescriptionRef ||
    patientSource.prescriptionReferenceNumber ||
    req.body.prescriptionRef ||
    req.body.prescriptionReferenceNumber ||
    'N/A'
  ).trim();

  const missingPatientFields = [];
  if (!patientName) missingPatientFields.push('patientName is required');
  if (!doctorName) missingPatientFields.push('doctorName is required');
  if (!prescription) missingPatientFields.push('prescription description is required');

  if (missingPatientFields.length > 0) {
    return ApiResponse.error(
      res,
      'Patient information validation failed. Patient name, doctor name, and prescription description are required.',
      missingPatientFields,
      400
    );
  }

  // STEP 2: EMPLOYEE PASSWORD VERIFICATION
  // Critical Security: Never trust client-sent verified=true flags or body employeeId.
  const enteredPassword = req.body.employeePassword || req.body.password;
  if (!enteredPassword) {
    return ApiResponse.error(
      res,
      'Employee authorization password is required for checkout verification.',
      ['employeePassword is required'],
      401
    );
  }

  // Strictly look up the currently authenticated employee via JWT req.user._id
  const employee = await Employee.findById(req.user._id).select('+password');
  if (!employee) {
    return ApiResponse.error(res, 'Active employee account not found.', ['User not found'], 401);
  }
  if (employee.status !== 'Active') {
    return ApiResponse.error(
      res,
      'Employee account is inactive. Inactive employees cannot authorize checkout.',
      ['Account is inactive'],
      403
    );
  }

  const isMatch = await employee.matchPassword(enteredPassword);
  if (!isMatch) {
    return ApiResponse.error(
      res,
      'Employee Verification Failed: Incorrect password entered. Sale aborted and stock has NOT been deducted.',
      ['Invalid authorization password'],
      401
    );
  }

  // Validate Cart / Items
  const items = req.body.items || req.body.cartItems;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return ApiResponse.error(
      res,
      'Checkout cart is empty. Add at least one medicine item to complete a sale.',
      ['items array cannot be empty'],
      400
    );
  }

  // STEP 3: COMPLETE SALE via centralized processSale() service
  const salePayload = {
    ...req.body,
    patientName,
    doctorName,
    prescription,
    prescriptionRef,
    prescriptionDescription: prescription,
    prescriptionReferenceNumber: prescriptionRef,
    items,
  };

  const sale = await processSale({
    saleData: salePayload,
    user: employee,
  });

  return ApiResponse.created(
    res,
    `Checkout verified & sale completed. Invoice #${sale.invoiceNumber} generated.`,
    {
      sale,
      invoice: {
        invoiceNumber: sale.invoiceNumber,
        date: sale.saleDateTime,
        patientName: sale.patientName,
        doctorName: sale.doctorName,
        prescription: sale.prescription,
        prescriptionRef: sale.prescriptionRef,
        employeeName: employee.name,
        employeeUsername: employee.username,
        items: sale.items,
        subtotal: sale.subtotal,
        totalDiscount: sale.totalDiscount,
        finalAmount: sale.finalAmount,
        paymentMethod: sale.paymentMethod,
      },
    }
  );
});

/**
 * @desc    Get sales history with search, filters, and pagination
 * @route   GET /api/v1/sales
 * @access  Private ('sales.view')
 */
const getSales = asyncHandler(async (req, res) => {
  const {
    search,
    q,
    employee,
    dateRange,
    paymentMethod,
    page = 1,
    limit,
    paginate,
  } = req.query;

  const filter = {};

  if (employee && employee !== 'all') {
    filter.employeeName = { $regex: new RegExp(`^${employee.trim()}$`, 'i') };
  }

  if (paymentMethod && paymentMethod !== 'all') {
    filter.paymentMethod = paymentMethod;
  }

  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      filter.$or = [{ saleDateTime: { $gte: todayStart } }, { date: { $gte: todayStart } }];
    } else if (dateRange === 'week' || dateRange === '7days') {
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      filter.$or = [{ saleDateTime: { $gte: weekStart } }, { date: { $gte: weekStart } }];
    } else if (dateRange === 'month' || dateRange === 'this_month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filter.$or = [{ saleDateTime: { $gte: monthStart } }, { date: { $gte: monthStart } }];
    }
  }

  const queryStr = (search || q || '').trim();
  if (queryStr) {
    const qRegex = { $regex: queryStr, $options: 'i' };
    filter.$or = [
      { invoiceNumber: qRegex },
      { patientName: qRegex },
      { doctorName: qRegex },
      { prescription: qRegex },
      { prescriptionRef: qRegex },
      { 'items.medicineName': qRegex },
      { 'items.batchNumber': qRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const isPaginationRequested = limit !== undefined && limit !== 'all' && parseInt(limit, 10) > 0;
  const limitNum = isPaginationRequested ? parseInt(limit, 10) : 0;

  const total = await Sale.countDocuments(filter);

  let query = Sale.find(filter).sort({ saleDateTime: -1, date: -1 });

  if (limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const sales = await query;

  const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1;
  const paginationData = {
    total,
    page: pageNum,
    limit: limitNum > 0 ? limitNum : total,
    pages: totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  if (paginate === 'true') {
    return ApiResponse.success(res, 'Sales history retrieved', {
      sales,
      pagination: paginationData,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Sales history retrieved',
    data: sales,
    pagination: paginationData,
    count: sales.length,
  });
});

/**
 * @desc    Get all sales conducted today
 * @route   GET /api/v1/sales/today
 * @access  Private ('sales.view')
 */
const getTodaySales = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sales = await Sale.find({
    $or: [{ saleDateTime: { $gte: todayStart } }, { date: { $gte: todayStart } }],
  }).sort({ saleDateTime: -1 });

  const totalTodayRevenue = sales.reduce(
    (sum, s) => sum + (Number(s.finalAmount || s.grandTotal) || 0),
    0
  );

  return ApiResponse.success(res, "Today's sales retrieved successfully", {
    count: sales.length,
    totalRevenue: Math.round(totalTodayRevenue * 100) / 100,
    sales,
  });
});

/**
 * @desc    Get complete sales summary analytics
 * @route   GET /api/v1/sales/summary
 * @access  Private ('sales.view')
 */
const getSalesSummary = asyncHandler(async (req, res) => {
  const allSales = await Sale.find();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalRevenue = 0;
  let todayRevenue = 0;
  let totalDiscountGiven = 0;
  let todaySalesCount = 0;
  let cashSalesCount = 0;
  let cardSalesCount = 0;

  allSales.forEach((s) => {
    const amt = Number(s.finalAmount !== undefined ? s.finalAmount : s.grandTotal || 0);
    const disc = Number(s.totalDiscount !== undefined ? s.totalDiscount : s.discountAmount || 0);
    const saleDate = new Date(s.saleDateTime || s.date || s.createdAt);

    totalRevenue += amt;
    totalDiscountGiven += disc;

    if (saleDate >= todayStart) {
      todaySalesCount += 1;
      todayRevenue += amt;
    }

    if (s.paymentMethod === 'Card') {
      cardSalesCount += 1;
    } else {
      cashSalesCount += 1;
    }
  });

  const totalSalesCount = allSales.length;
  const averageOrderValue =
    totalSalesCount > 0 ? Math.round((totalRevenue / totalSalesCount) * 100) / 100 : 0;

  return ApiResponse.success(res, 'Sales summary analytics computed', {
    totalSalesCount,
    todaySalesCount,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
    averageOrderValue,
    paymentMethods: {
      cash: cashSalesCount,
      card: cardSalesCount,
    },
  });
});

/**
 * @desc    Get single sale details by ID or invoiceNumber
 * @route   GET /api/v1/sales/:id
 * @access  Private ('sales.view')
 */
const getSaleById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { invoiceNumber: id }] } : { invoiceNumber: id };

  const sale = await Sale.findOne(query);

  if (!sale) {
    return ApiResponse.error(res, 'Sale record not found', ['No sale matches identifier'], 404);
  }

  // Also fetch individual SaleItem documents if available
  const items = await SaleItem.find({ saleId: sale._id });

  return ApiResponse.success(res, 'Sale details retrieved', {
    ...sale.toObject(),
    saleItems: items.length > 0 ? items : sale.items,
  });
});

module.exports = {
  createSale,
  checkoutSale,
  getSales,
  getTodaySales,
  getSalesSummary,
  getSaleById,
};
