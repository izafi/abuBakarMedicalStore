const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const StockHistory = require('../models/StockHistory');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get inventory summary metrics
 * @route   GET /api/v1/inventory/dashboard
 * @access  Public / Private
 */
const getInventoryDashboard = asyncHandler(async (req, res) => {
  const batches = await Batch.find();
  const settings = (await Settings.findOne()) || { lowStockThreshold: 15, nearExpiryDays: 60 };

  let totalStock = 0;
  let availableStock = 0;
  let expiredUnits = 0;
  let totalCostValue = 0;
  let totalRetailValue = 0;

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let nearExpiryCount = 0;
  let expiredStockCount = 0;

  const now = new Date();

  batches.forEach((b) => {
    const qty = Number(b.quantity) || 0;
    const expiry = new Date(b.expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    totalStock += qty;
    totalCostValue += (Number(b.purchasePrice) || 0) * qty;
    totalRetailValue += (Number(b.sellingPrice) || 0) * qty;

    if (daysLeft < 0) {
      expiredStockCount += 1;
      expiredUnits += qty;
    } else {
      if (qty > 0) {
        availableStock += qty;
      }
      if (qty === 0) {
        outOfStockCount += 1;
      } else if (qty <= settings.lowStockThreshold) {
        lowStockCount += 1;
      }
      if (daysLeft <= settings.nearExpiryDays) {
        nearExpiryCount += 1;
      }
    }
  });

  const totalMedicines = await Medicine.countDocuments();

  const metrics = {
    totalMedicines,
    totalBatches: batches.length,
    totalStock,
    availableStock,
    lowStockCount,
    outOfStockCount,
    nearExpiryCount,
    expiredStockCount,
    expiredUnits,
    totalCostValue,
    totalRetailValue,
  };

  return ApiResponse.success(res, 'Inventory metrics computed', metrics);
});

/**
 * @desc    Adjust batch stock (Add, Update, Remove) with audit log
 * @route   POST /api/v1/inventory/adjust-stock
 * @access  Private ('inventory.edit')
 */
const adjustStock = asyncHandler(async (req, res) => {
  const { batchId, delta, actionType, reason } = req.body;

  if (!batchId || delta === undefined) {
    return ApiResponse.error(res, 'batchId and delta are required', ['Missing fields'], 400);
  }

  const batch = await Batch.findOne({
    $or: [{ _id: batchId }, { batchId }],
  });

  if (!batch) {
    return ApiResponse.error(res, `Batch '${batchId}' not found`, ['Invalid batchId'], 404);
  }

  const currentQty = batch.quantity;
  const numDelta = Number(delta);
  const newQty = currentQty + numDelta;

  if (newQty < 0) {
    return ApiResponse.error(
      res,
      `Cannot reduce stock below zero! Current stock is ${currentQty}.`,
      ['Stock cannot be negative'],
      400
    );
  }

  batch.quantity = newQty;
  await batch.save();

  // Record Stock History
  const historyEntry = await StockHistory.create({
    stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    medicineId: batch.medicineId,
    batchId: batch.batchId,
    previousQuantity: currentQty,
    changedQuantity: numDelta,
    newQuantity: newQty,
    actionType: actionType || (numDelta > 0 ? 'Add Stock' : 'Remove Stock'),
    employeeId: req.user?.employeeId || 'STAFF-01',
    employeeName: req.user?.name || 'Staff Pharmacist',
    reason: reason || 'Manual stock adjustment',
  });

  return ApiResponse.success(res, 'Stock adjusted successfully', {
    batchId: batch.batchId,
    previousQuantity: currentQty,
    newQuantity: newQty,
    history: historyEntry,
  });
});

/**
 * @desc    Get stock history audit log
 * @route   GET /api/v1/inventory/stock-history
 * @access  Private ('inventory.view')
 */
const getStockHistory = asyncHandler(async (req, res) => {
  const { medicineId, batchId, actionType, limit = 50 } = req.query;
  const filter = {};

  if (medicineId) filter.medicineId = medicineId;
  if (batchId) filter.batchId = batchId;
  if (actionType && actionType !== 'all') filter.actionType = actionType;

  const history = await StockHistory.find(filter)
    .sort({ timestamp: -1 })
    .limit(Number(limit));

  return ApiResponse.success(res, 'Stock history retrieved', history);
});

/**
 * @desc    Get all distinct medicine categories
 * @route   GET /api/v1/inventory/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Medicine.distinct('category');
  return ApiResponse.success(res, 'Categories retrieved', categories);
});

module.exports = {
  getInventoryDashboard,
  adjustStock,
  getStockHistory,
  getCategories,
};
