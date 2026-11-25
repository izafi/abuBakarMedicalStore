const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const SaleItem = require('../models/SaleItem');
const Batch = require('../models/Batch');
const StockHistory = require('../models/StockHistory');
const Invoice = require('../models/Invoice');
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

  // STEP 1: PATIENT INFORMATION (OPTIONAL)
  const patientSource = req.body.patientInfo || req.body.patient || req.body || {};
  const patientName = (patientSource.patientName || patientSource.customerName || req.body.patientName || '').trim() || 'Walk-in Customer';
  const doctorName = (patientSource.doctorName || req.body.doctorName || '').trim() || 'Self / Counter';
  const prescription = (
    patientSource.prescription ||
    patientSource.prescriptionDescription ||
    req.body.prescription ||
    req.body.prescriptionDescription ||
    ''
  ).trim() || 'Counter dispensing';
  const prescriptionRef = (
    patientSource.prescriptionRef ||
    patientSource.prescriptionReferenceNumber ||
    req.body.prescriptionRef ||
    req.body.prescriptionReferenceNumber ||
    'N/A'
  ).trim() || 'N/A';

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

/**
 * @desc    Process customer return for an item on a given invoice
 *          Replenishes batch stock, logs stock history audit, and removes/updates the medicine from sales history & invoice
 * @route   POST /api/v1/sales/return-item
 * @access  Private ('sales.add')
 */
const returnSaleItem = asyncHandler(async (req, res) => {
  const { invoiceNumber, batchId, batchNumber, medicineId, medicineName, quantity, reason } = req.body;

  if (!invoiceNumber || !invoiceNumber.trim()) {
    return ApiResponse.error(res, 'Original sales invoice number is required for customer return.', ['Missing invoiceNumber'], 400);
  }

  const query = { invoiceNumber: { $regex: new RegExp(`^${invoiceNumber.trim()}$`, 'i') } };
  const sale = await Sale.findOne(query);

  if (!sale) {
    return ApiResponse.error(res, `Invoice #${invoiceNumber} not found in sales history.`, ['Invoice not found'], 404);
  }

  const cleanMedicineText = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().replace(/\[object object\]/gi, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const extractCleanId = (val) => {
    if (!val) return '';
    if (typeof val === 'object' && val !== null) {
      return (val._id || val.id || val.medicineId || '').toString().trim().toLowerCase();
    }
    const s = String(val).trim().toLowerCase();
    if (s === '[object object]') return '';
    return s;
  };

  // Find matching item in sale.items ensuring it genuinely matches the specific medicine being adjusted
  const itemIndex = sale.items.findIndex((it) => {
    // 1. Check Batch Number if provided
    const bBatch = (batchNumber || '').trim().toLowerCase();
    const itBatch = (it.batchNumber || it.batchNo || it.batchId || '').trim().toLowerCase();
    if (bBatch && itBatch && bBatch === itBatch) {
      return true;
    }

    // 2. Check Medicine ID if provided (strictly ignoring [object Object])
    const bMedId = extractCleanId(medicineId || batchId);
    const itMedId = extractCleanId(it.medicineId || it.medicineCode);
    if (bMedId && itMedId && bMedId === itMedId) {
      return true;
    }

    // 3. Check Medicine Name (Strict primary token match, not loose substring)
    const bName = cleanMedicineText(medicineName);
    const itName = cleanMedicineText(it.medicineName || it.name);
    if (bName && itName) {
      if (bName === itName) return true;
      const bTokens = bName.split(' ').filter((w) => w.length >= 3);
      const itTokens = itName.split(' ').filter((w) => w.length >= 3);
      if (bTokens.length > 0 && itTokens.length > 0 && bTokens[0] === itTokens[0]) {
        return true;
      }
    }

    return false;
  });

  if (itemIndex === -1) {
    const invoiceMedicineNames = sale.items.map((i) => i.medicineName).join(', ');
    return ApiResponse.error(
      res,
      `Invoice #${sale.invoiceNumber} is for '${invoiceMedicineNames}' and does NOT contain '${medicineName || 'this medicine'}'. Please select the correct invoice.`,
      ['Item not found on specified invoice'],
      400
    );
  }

  const item = sale.items[itemIndex];
  const returnQty = Math.max(1, Math.min(Number(quantity) || item.quantity, item.quantity));

  // 1. Adjust Batch Stock
  let targetBatch = null;
  if (batchId) {
    const isObjId = mongoose.Types.ObjectId.isValid(batchId);
    targetBatch = await Batch.findOne(isObjId ? { $or: [{ _id: batchId }, { batchId }] } : { batchId });
  }
  if (!targetBatch && (batchNumber || item.batchNumber)) {
    targetBatch = await Batch.findOne({ batchNumber: batchNumber || item.batchNumber });
  }

  if (targetBatch) {
    const prevQty = Number(targetBatch.quantity) || 0;
    targetBatch.quantity = prevQty + returnQty;
    targetBatch.updatedBy = req.user?._id || null;
    await targetBatch.save();

    // Log StockHistory audit record
    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: targetBatch.medicineCode || targetBatch.medicineId?.toString() || item.medicineId,
      batchId: targetBatch.batchId,
      previousQuantity: prevQty,
      changedQuantity: returnQty,
      newQuantity: targetBatch.quantity,
      actionType: 'RETURN',
      employeeId: req.user?.username || req.user?.name || 'STAFF-01',
      employeeName: req.user?.name || 'Staff Pharmacist',
      reason: reason?.trim() || `Customer return to stock (Invoice: #${sale.invoiceNumber})`,
      dateTime: new Date(),
    });
  }

  // 2. Remove or update medicine in the sales record & invoice
  let isEntireSaleRemoved = false;
  let updatedSale = null;

  if (item.quantity <= returnQty) {
    // Remove the medicine from the invoice items array
    sale.items.splice(itemIndex, 1);
    await SaleItem.deleteMany({ saleId: sale._id, batchNumber: item.batchNumber });
  } else {
    // Partial return: deduct quantity and recompute line total
    item.quantity -= returnQty;
    item.subtotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    const discountAmt = Math.round(((item.subtotal * (item.discountPercent || 0)) / 100) * 100) / 100;
    item.discountAmount = discountAmt;
    item.total = Math.round((item.subtotal - discountAmt) * 100) / 100;
    item.finalTotal = item.total;

    await SaleItem.updateOne(
      { saleId: sale._id, batchNumber: item.batchNumber },
      { $set: { quantity: item.quantity, subtotal: item.subtotal, total: item.total } }
    );
  }

  if (sale.items.length === 0) {
    // When all medicines are removed from the invoice, remove it from sales history so reports update cleanly
    await Sale.deleteOne({ _id: sale._id });
    await Invoice.deleteOne({ saleId: sale._id });
    isEntireSaleRemoved = true;
  } else {
    const newSubtotal = sale.items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
    const newDiscount = sale.items.reduce((sum, it) => sum + (Number(it.discountAmount) || 0), 0);
    const newGrandTotal = Math.max(0, Math.round((newSubtotal - newDiscount) * 100) / 100);

    sale.subtotal = Math.round(newSubtotal * 100) / 100;
    sale.totalDiscount = Math.round(newDiscount * 100) / 100;
    sale.discountAmount = sale.totalDiscount;
    sale.grandTotal = newGrandTotal;
    sale.finalAmount = newGrandTotal;
    await sale.save();

    await Invoice.updateOne(
      { saleId: sale._id },
      {
        $set: {
          items: sale.items,
          subtotal: sale.subtotal,
          discountAmount: sale.discountAmount,
          total: sale.grandTotal,
        },
      }
    );
    updatedSale = sale;
  }

  return ApiResponse.success(
    res,
    `Customer return of ${returnQty} units processed successfully. Medicine removed from sales history and returned to stock.`,
    {
      invoiceNumber: sale.invoiceNumber,
      returnedQuantity: returnQty,
      isEntireSaleRemoved,
      updatedSale,
      updatedBatch: targetBatch,
    }
  );
});

module.exports = {
  createSale,
  checkoutSale,
  getSales,
  getTodaySales,
  getSalesSummary,
  getSaleById,
  returnSaleItem,
};
