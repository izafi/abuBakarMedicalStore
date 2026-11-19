const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const StockHistory = require('../models/StockHistory');
const Settings = require('../models/Settings');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Transaction Execution Helper:
 * Uses MongoDB ACID transactions when available on a replica set / cluster (e.g. MongoDB Atlas).
 * Fallback to atomic sequential writes if running in a standalone local environment without replica set.
 *
 * NOTE ON MONGODB REPLICA-SET REQUIREMENT:
 * MongoDB multi-document transactions require a replica set deployment (or sharded cluster).
 * Standalone `mongod` instances do not support multi-document transactions unless started with --replSet.
 */
const runInTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await workFn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (
      err.message?.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
      err.message?.includes('Transactions are not supported by this deployment')
    ) {
      // Graceful fallback for standalone dev instances
      return await workFn(null);
    }
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Helper to compute batch stock status
 */
const computeStatus = (batch, minAlert = 15, nearExpiryDays = 60) => {
  const now = new Date();
  const expiry = new Date(batch.expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const qty = Number(batch.quantity) || 0;

  if (daysLeft < 0) return 'Expired';
  if (qty <= 0) return 'Out of Stock';
  if (daysLeft <= nearExpiryDays) return 'Near Expiry';
  if (qty <= minAlert) return 'Low Stock';
  return 'In Stock';
};

/**
 * Helper to enrich batch object with medicine metadata
 */
const enrichInventoryItem = (batch) => {
  const bObj = batch.toObject ? batch.toObject() : batch;
  const med = bObj.medicineId && typeof bObj.medicineId === 'object' ? bObj.medicineId : null;
  const computedStatus = computeStatus(bObj, med?.minStockAlert || 15);

  return {
    ...bObj,
    id: bObj._id,
    status: computedStatus,
    medicineName: med ? med.name : 'Unknown Medicine',
    genericName: med ? med.genericName : '',
    brand: med ? med.brand : '',
    formula: med ? med.formula : '',
    strength: med ? med.strength : '',
    category: med ? med.category : 'General',
    rack: bObj.rack || med?.rack || 'Rack A-1',
    shelf: bObj.shelf || med?.shelf || 'Shelf 1',
    location: `${bObj.rack || med?.rack || 'Rack A-1'}, ${bObj.shelf || med?.shelf || 'Shelf 1'}`,
    canSell: computedStatus !== 'Expired' && bObj.quantity > 0,
    availableStock: bObj.quantity,
  };
};

/**
 * @desc    Get all inventory with search, filters, pagination, and sorting
 * @route   GET /api/v1/inventory
 * @access  Public / Private ('inventory.view')
 */
const getInventory = asyncHandler(async (req, res) => {
  const {
    search,
    q,
    status,
    category,
    page = 1,
    limit,
    sortBy = 'expiryDate',
    sortOrder = 'asc',
    paginate,
  } = req.query;

  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  const queryStr = (search || q || '').trim();
  if (queryStr) {
    const searchRegex = { $regex: queryStr, $options: 'i' };
    filter.$or = [
      { batchNumber: searchRegex },
      { supplier: searchRegex },
      { rack: searchRegex },
      { shelf: searchRegex },
      { batchId: searchRegex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const isPaginationRequested = limit !== undefined && limit !== 'all' && parseInt(limit, 10) > 0;
  const limitNum = isPaginationRequested ? parseInt(limit, 10) : 0;

  const total = await Batch.countDocuments(filter);

  let query = Batch.find(filter)
    .populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert rack shelf')
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

  if (limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  let batches = await query;
  let enriched = batches.map(enrichInventoryItem);

  // If search matches medicine name, filter if not already matched
  if (queryStr) {
    const qLower = queryStr.toLowerCase();
    enriched = enriched.filter(
      (b) =>
        b.batchNumber?.toLowerCase().includes(qLower) ||
        b.medicineName?.toLowerCase().includes(qLower) ||
        b.genericName?.toLowerCase().includes(qLower) ||
        b.brand?.toLowerCase().includes(qLower) ||
        b.formula?.toLowerCase().includes(qLower) ||
        b.rack?.toLowerCase().includes(qLower) ||
        b.shelf?.toLowerCase().includes(qLower)
    );
  }

  if (category && category !== 'all') {
    enriched = enriched.filter((b) => b.category?.toLowerCase() === category.toLowerCase());
  }

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
    return ApiResponse.success(res, 'Inventory retrieved successfully', {
      inventory: enriched,
      pagination: paginationData,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Inventory retrieved successfully',
    data: enriched,
    pagination: paginationData,
    count: enriched.length,
  });
});

/**
 * @desc    Get inventory summary and dashboard metrics
 * @route   GET /api/v1/inventory/summary or GET /api/v1/inventory/dashboard
 * @access  Public / Private
 */
const getInventorySummary = asyncHandler(async (req, res) => {
  const batches = await Batch.find().populate('medicineId', 'minStockAlert');
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
      if (qty <= 0) {
        outOfStockCount += 1;
      } else if (qty <= settings.lowStockThreshold) {
        lowStockCount += 1;
      }
      if (daysLeft <= settings.nearExpiryDays) {
        nearExpiryCount += 1;
      }
    }
  });

  const totalMedicines = await Medicine.countDocuments({ isActive: { $ne: false } });

  const metrics = {
    totalMedicines,
    totalBatches: batches.length,
    totalStock,
    totalStockUnits: totalStock,
    availableStock,
    availableStockUnits: availableStock,
    lowStockCount,
    outOfStockCount,
    nearExpiryCount,
    expiredStockCount,
    expiredUnits,
    totalCostValue,
    totalRetailValue,
  };

  return ApiResponse.success(res, 'Inventory summary computed successfully', metrics);
});

/**
 * @desc    Get low stock inventory items
 * @route   GET /api/v1/inventory/low-stock
 * @access  Public / Private
 */
const getLowStock = asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne()) || { lowStockThreshold: 15 };
  const threshold = Number(req.query.threshold) || settings.lowStockThreshold || 15;

  const now = new Date();
  const batches = await Batch.find({
    quantity: { $gt: 0, $lte: threshold },
    expiryDate: { $gte: now },
  })
    .populate('medicineId', 'name genericName brand formula strength type category minStockAlert rack shelf')
    .sort({ quantity: 1 });

  const enriched = batches.map(enrichInventoryItem);
  return ApiResponse.success(res, `Found ${enriched.length} low-stock batches`, enriched);
});

/**
 * @desc    Get out-of-stock inventory items
 * @route   GET /api/v1/inventory/out-of-stock
 * @access  Public / Private
 */
const getOutOfStock = asyncHandler(async (req, res) => {
  const batches = await Batch.find({
    quantity: { $lte: 0 },
  })
    .populate('medicineId', 'name genericName brand formula strength type category minStockAlert rack shelf')
    .sort({ updatedAt: -1 });

  const enriched = batches.map(enrichInventoryItem);
  return ApiResponse.success(res, `Found ${enriched.length} out-of-stock batches`, enriched);
});

/**
 * @desc    Get near-expiry inventory items
 * @route   GET /api/v1/inventory/near-expiry
 * @access  Public / Private
 */
const getNearExpiry = asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne()) || { nearExpiryDays: 60 };
  const days = Number(req.query.days) || settings.nearExpiryDays || 60;
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const batches = await Batch.find({
    expiryDate: { $gte: now, $lte: thresholdDate },
  })
    .populate('medicineId', 'name genericName brand formula strength type category minStockAlert rack shelf')
    .sort({ expiryDate: 1 });

  const enriched = batches.map(enrichInventoryItem);
  return ApiResponse.success(res, `Found ${enriched.length} batches nearing expiry within ${days} days`, enriched);
});

/**
 * @desc    Get expired inventory items
 * @route   GET /api/v1/inventory/expired
 * @access  Public / Private
 */
const getExpired = asyncHandler(async (req, res) => {
  const now = new Date();
  const batches = await Batch.find({
    expiryDate: { $lt: now },
  })
    .populate('medicineId', 'name genericName brand formula strength type category minStockAlert rack shelf')
    .sort({ expiryDate: 1 });

  const enriched = batches.map(enrichInventoryItem);
  return ApiResponse.success(res, `Found ${enriched.length} expired batches`, enriched);
});

/**
 * @desc    Add stock to an exact batch
 * @route   POST /api/v1/inventory/add-stock
 * @access  Private ('inventory.edit' or 'inventory.add')
 */
const addStock = asyncHandler(async (req, res) => {
  const { batchId, quantity, reason } = req.body;

  if (!batchId || quantity === undefined) {
    return ApiResponse.error(res, 'batchId and quantity are required', ['Missing fields'], 400);
  }

  const addQty = Number(quantity);
  if (isNaN(addQty) || addQty <= 0) {
    return ApiResponse.error(res, 'Quantity added must be a positive number greater than 0.', ['Invalid quantity'], 400);
  }

  const result = await runInTransaction(async (session) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(batchId);
    const query = isObjectId ? { $or: [{ _id: batchId }, { batchId }] } : { batchId };

    const batch = await Batch.findOne(query).session(session || null);
    if (!batch) {
      const error = new Error(`Batch '${batchId}' not found in inventory.`);
      error.statusCode = 404;
      throw error;
    }

    const previousQuantity = batch.quantity;
    const newQuantity = previousQuantity + addQty;

    batch.quantity = newQuantity;
    batch.updatedBy = req.user?._id || null;
    await batch.save({ session: session || null });

    const stockHistoryId = `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const historyEntry = await StockHistory.create(
      [
        {
          stockHistoryId,
          medicineId: batch.medicineCode || batch.medicineId.toString(),
          batchId: batch.batchId,
          previousQuantity,
          changedQuantity: addQty,
          newQuantity,
          actionType: 'ADD',
          employeeId: req.user?.username || req.user?.name || 'STAFF-01',
          employeeName: req.user?.name || 'Staff Pharmacist',
          reason: reason?.trim() || `Added stock receipt (+${addQty} units)`,
          dateTime: new Date(),
        },
      ],
      { session: session || null }
    );

    return { batch, history: historyEntry[0] };
  });

  return ApiResponse.success(res, `Successfully added ${addQty} units to batch '${result.batch.batchNumber}'.`, {
    batchId: result.batch.batchId,
    batchNumber: result.batch.batchNumber,
    previousQuantity: result.history.previousQuantity,
    addedQuantity: addQty,
    newQuantity: result.batch.quantity,
    history: result.history,
  });
});

/**
 * @desc    Remove stock from an exact batch (Never allow negative stock!)
 * @route   POST /api/v1/inventory/remove-stock
 * @access  Private ('inventory.edit')
 */
const removeStock = asyncHandler(async (req, res) => {
  const { batchId, quantity, reason } = req.body;

  if (!batchId || quantity === undefined) {
    return ApiResponse.error(res, 'batchId and quantity are required', ['Missing fields'], 400);
  }

  const removeQty = Number(quantity);
  if (isNaN(removeQty) || removeQty <= 0) {
    return ApiResponse.error(res, 'Quantity removed must be a positive number greater than 0.', ['Invalid quantity'], 400);
  }

  const result = await runInTransaction(async (session) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(batchId);
    const query = isObjectId ? { $or: [{ _id: batchId }, { batchId }] } : { batchId };

    const batch = await Batch.findOne(query).session(session || null);
    if (!batch) {
      const error = new Error(`Batch '${batchId}' not found in inventory.`);
      error.statusCode = 404;
      throw error;
    }

    const previousQuantity = batch.quantity;

    // Strict Business Rule: Never allow negative stock!
    if (previousQuantity - removeQty < 0) {
      const error = new Error(
        `Operation Denied: Cannot remove ${removeQty} units. Available stock is only ${previousQuantity}. Negative stock is strictly prohibited.`
      );
      error.statusCode = 400;
      throw error;
    }

    const newQuantity = previousQuantity - removeQty;

    batch.quantity = newQuantity;
    batch.updatedBy = req.user?._id || null;
    await batch.save({ session: session || null });

    const stockHistoryId = `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const historyEntry = await StockHistory.create(
      [
        {
          stockHistoryId,
          medicineId: batch.medicineCode || batch.medicineId.toString(),
          batchId: batch.batchId,
          previousQuantity,
          changedQuantity: -removeQty,
          newQuantity,
          actionType: 'REMOVE',
          employeeId: req.user?.username || req.user?.name || 'STAFF-01',
          employeeName: req.user?.name || 'Staff Pharmacist',
          reason: reason?.trim() || `Stock removal / disposal (-${removeQty} units)`,
          dateTime: new Date(),
        },
      ],
      { session: session || null }
    );

    return { batch, history: historyEntry[0] };
  });

  return ApiResponse.success(res, `Successfully removed ${removeQty} units from batch '${result.batch.batchNumber}'.`, {
    batchId: result.batch.batchId,
    batchNumber: result.batch.batchNumber,
    previousQuantity: result.history.previousQuantity,
    removedQuantity: removeQty,
    newQuantity: result.batch.quantity,
    history: result.history,
  });
});

/**
 * @desc    Update stock of an exact batch (Recalculate delta & record history)
 * @route   PUT /api/v1/inventory/update-stock
 * @access  Private ('inventory.edit')
 */
const updateStock = asyncHandler(async (req, res) => {
  const { batchId, newQuantity, reason } = req.body;

  if (!batchId || newQuantity === undefined) {
    return ApiResponse.error(res, 'batchId and newQuantity are required', ['Missing fields'], 400);
  }

  const targetQty = Number(newQuantity);
  if (isNaN(targetQty) || targetQty < 0) {
    return ApiResponse.error(res, 'newQuantity cannot be negative.', ['Negative stock forbidden'], 400);
  }

  const result = await runInTransaction(async (session) => {
    const isObjectId = mongoose.Types.ObjectId.isValid(batchId);
    const query = isObjectId ? { $or: [{ _id: batchId }, { batchId }] } : { batchId };

    const batch = await Batch.findOne(query).session(session || null);
    if (!batch) {
      const error = new Error(`Batch '${batchId}' not found in inventory.`);
      error.statusCode = 404;
      throw error;
    }

    const previousQuantity = batch.quantity;
    const changedQuantity = targetQty - previousQuantity;

    batch.quantity = targetQty;
    batch.updatedBy = req.user?._id || null;
    await batch.save({ session: session || null });

    const stockHistoryId = `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const historyEntry = await StockHistory.create(
      [
        {
          stockHistoryId,
          medicineId: batch.medicineCode || batch.medicineId.toString(),
          batchId: batch.batchId,
          previousQuantity,
          changedQuantity,
          newQuantity: targetQty,
          actionType: 'UPDATE',
          employeeId: req.user?.username || req.user?.name || 'STAFF-01',
          employeeName: req.user?.name || 'Staff Pharmacist',
          reason: reason?.trim() || `Manual stock audit correction (${previousQuantity} -> ${targetQty})`,
          dateTime: new Date(),
        },
      ],
      { session: session || null }
    );

    return { batch, history: historyEntry[0] };
  });

  return ApiResponse.success(res, `Successfully updated stock for batch '${result.batch.batchNumber}' to ${targetQty}.`, {
    batchId: result.batch.batchId,
    batchNumber: result.batch.batchNumber,
    previousQuantity: result.history.previousQuantity,
    changedQuantity: result.history.changedQuantity,
    newQuantity: targetQty,
    history: result.history,
  });
});

/**
 * @desc    Get complete stock history audit logs
 * @route   GET /api/v1/inventory/history
 * @access  Private ('inventory.view')
 */
const getStockHistory = asyncHandler(async (req, res) => {
  const { medicineId, batchId, actionType, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (medicineId) filter.medicineId = medicineId;
  if (batchId) filter.batchId = batchId;
  if (actionType && actionType !== 'all') {
    filter.actionType = actionType;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 50);

  const total = await StockHistory.countDocuments(filter);
  const history = await StockHistory.find(filter)
    .sort({ dateTime: -1, createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  return ApiResponse.success(res, 'Stock history audit logs retrieved successfully', {
    history,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * @desc    Get stock history for a specific batch
 * @route   GET /api/v1/inventory/history/:batchId
 * @access  Private ('inventory.view')
 */
const getStockHistoryByBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  const history = await StockHistory.find({ batchId })
    .sort({ dateTime: -1, createdAt: -1 });

  return ApiResponse.success(res, `Stock history for batch '${batchId}' retrieved`, history);
});

/**
 * @desc    Get all distinct medicine categories
 * @route   GET /api/v1/inventory/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Medicine.distinct('category', { isActive: { $ne: false } });
  return ApiResponse.success(res, 'Categories retrieved', categories.filter(Boolean).sort());
});

module.exports = {
  getInventory,
  getInventorySummary,
  getLowStock,
  getOutOfStock,
  getNearExpiry,
  getExpired,
  addStock,
  removeStock,
  updateStock,
  getStockHistory,
  getStockHistoryByBatch,
  getCategories,
};
