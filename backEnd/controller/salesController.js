const Sale = require('../models/Sale');
const Batch = require('../models/Batch');
const Employee = require('../models/Employee');
const StockHistory = require('../models/StockHistory');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Generate unique invoice number e.g. INV-20261118-4902
 */
const generateInvoiceNumber = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}${month}${day}-${randomSuffix}`;
};

/**
 * @desc    Process Checkout (Mandatory Three-Step Verification)
 * @route   POST /api/v1/sales/checkout
 * @access  Private ('sales.add')
 */
const checkoutSale = asyncHandler(async (req, res) => {
  const {
    patientInfo,
    employeePassword,
    items,
    paymentMethod = 'Cash',
    amountReceived = 0,
    subtotal,
    discountAmount = 0,
    grandTotal,
  } = req.body;

  // STEP 1: VALIDATE PATIENT INFO
  if (!patientInfo || !patientInfo.patientName || !patientInfo.doctorName || !patientInfo.prescriptionDescription) {
    return ApiResponse.error(
      res,
      'Step 1 Incomplete: Patient name, doctor name, and prescription description are required.',
      ['Required patient details missing'],
      400
    );
  }

  // STEP 2: VERIFY EMPLOYEE PASSWORD
  if (!employeePassword) {
    return ApiResponse.error(
      res,
      'Step 2 Incomplete: Employee verification password is required to authorize medicine dispensing.',
      ['Password required'],
      401
    );
  }

  // Fetch active user with password field
  const employee = await Employee.findById(req.user._id).select('+password');
  if (!employee) {
    return ApiResponse.error(res, 'Active employee account not found', ['Invalid session'], 401);
  }

  const isPasswordValid = await employee.matchPassword(employeePassword);
  if (!isPasswordValid) {
    // CRITICAL: Stock is NOT deducted, sale is rejected
    return ApiResponse.error(
      res,
      'Employee Verification Failed: Incorrect password entered. Sale aborted and stock has NOT been deducted.',
      ['Invalid employee authorization password'],
      401
    );
  }

  // STEP 3: VALIDATE ITEMS & COMPLETE SALE
  if (!items || !Array.isArray(items) || items.length === 0) {
    return ApiResponse.error(res, 'Sales cart is empty. Add medicines before checkout.', ['Cart is empty'], 400);
  }

  // 3.1 Verify batch existence and stock availability
  const now = new Date();
  for (const item of items) {
    const batch = await Batch.findOne({
      $or: [{ _id: item.batchId }, { batchId: item.batchId }],
    });

    if (!batch) {
      return ApiResponse.error(
        res,
        `Batch '${item.batchNumber}' for '${item.medicineName}' not found in inventory.`,
        ['Batch not found'],
        400
      );
    }

    if (new Date(batch.expiryDate) < now) {
      return ApiResponse.error(
        res,
        `SAFETY VIOLATION: Batch '${batch.batchNumber}' is EXPIRED! Expired medicines cannot be sold.`,
        ['Expired batch'],
        400
      );
    }

    if (batch.quantity < item.quantity) {
      return ApiResponse.error(
        res,
        `Insufficient stock for '${item.medicineName}' (Batch: ${batch.batchNumber}). Available: ${batch.quantity}, Requested: ${item.quantity}.`,
        ['Insufficient stock'],
        400
      );
    }
  }

  // 3.2 Generate unique invoice number
  const invoiceNumber = generateInvoiceNumber();

  // 3.3 Deduct stock from exact batches and create audit logs
  for (const item of items) {
    const batch = await Batch.findOne({
      $or: [{ _id: item.batchId }, { batchId: item.batchId }],
    });

    const prevQty = batch.quantity;
    const newQty = prevQty - Number(item.quantity);
    batch.quantity = newQty;
    await batch.save();

    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: item.medicineId,
      batchId: batch.batchId,
      previousQuantity: prevQty,
      changedQuantity: -Number(item.quantity),
      newQuantity: newQty,
      actionType: 'Sale Deduction',
      employeeId: employee.employeeId,
      employeeName: employee.name,
      reason: `Dispensed in Invoice #${invoiceNumber}`,
    });
  }

  // 3.4 Create immutable sale record
  const received = Number(amountReceived) || Number(grandTotal);
  const changeReturned = Math.max(0, received - Number(grandTotal));

  const sale = await Sale.create({
    invoiceNumber,
    date: new Date(),
    patientName: patientInfo.patientName.trim(),
    customerName: patientInfo.patientName.trim(),
    doctorName: patientInfo.doctorName.trim(),
    prescriptionDescription: patientInfo.prescriptionDescription.trim(),
    prescriptionReferenceNumber: patientInfo.prescriptionReferenceNumber?.trim() || 'N/A',
    employeeName: employee.name,
    employeeUsername: employee.username,
    employeeId: employee.employeeId,
    paymentMethod,
    amountReceived: received,
    changeReturned,
    items,
    subtotal: Number(subtotal),
    discountAmount: Number(discountAmount) || 0,
    grandTotal: Number(grandTotal),
    status: 'Completed',
  });

  return ApiResponse.created(res, `Sale completed & Invoice #${invoiceNumber} issued`, sale);
});

/**
 * @desc    Get sales history with search and filters
 * @route   GET /api/v1/sales
 * @access  Private ('sales.view')
 */
const getSales = asyncHandler(async (req, res) => {
  const { search, employee, dateRange, paymentMethod } = req.query;
  const filter = {};

  if (employee && employee !== 'all') {
    filter.employeeName = employee;
  }

  if (paymentMethod && paymentMethod !== 'all') {
    filter.paymentMethod = paymentMethod;
  }

  if (dateRange && dateRange !== 'all') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      filter.date = { $gte: todayStart };
    } else if (dateRange === 'week' || dateRange === '7days') {
      filter.date = { $gte: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === 'month' || dateRange === 'this_month') {
      filter.date = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { invoiceNumber: { $regex: q, $options: 'i' } },
      { patientName: { $regex: q, $options: 'i' } },
      { doctorName: { $regex: q, $options: 'i' } },
      { 'items.medicineName': { $regex: q, $options: 'i' } },
      { 'items.batchNumber': { $regex: q, $options: 'i' } },
    ];
  }

  const sales = await Sale.find(filter).sort({ date: -1 });

  return ApiResponse.success(res, 'Sales history retrieved', sales);
});

/**
 * @desc    Get single sale by ID or invoiceNumber
 * @route   GET /api/v1/sales/:id
 * @access  Private ('sales.view')
 */
const getSaleById = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({
    $or: [{ _id: req.params.id }, { invoiceNumber: req.params.id }],
  });

  if (!sale) {
    return ApiResponse.error(res, 'Sale record not found', ['No sale matches identifier'], 404);
  }

  return ApiResponse.success(res, 'Sale details retrieved', sale);
});

module.exports = {
  checkoutSale,
  getSales,
  getSaleById,
};
