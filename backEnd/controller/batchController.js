const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Compute batch stock status based on expiration date and quantity
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
 * Helper to enrich batch object with medicine metadata and saleability flag
 */
const enrichBatch = (batch) => {
  const bObj = batch.toObject ? batch.toObject() : batch;
  const med = bObj.medicineId && typeof bObj.medicineId === 'object' ? bObj.medicineId : null;
  const computedStatus = computeStatus(bObj, med?.minStockAlert || 15);

  return {
    ...bObj,
    id: bObj._id,
    status: computedStatus,
    medicineName: med ? med.name : 'Unknown Medicine',
    medicineCode: med ? med.medicineId : bObj.medicineCode || '',
    genericName: med ? med.genericName : '',
    brand: med ? med.brand : '',
    formula: med ? med.formula : '',
    strength: med ? med.strength : '',
    category: med ? med.category : 'General',
    canSell: computedStatus !== 'Expired' && bObj.quantity > 0,
    availableStock: bObj.quantity,
  };
};

/**
 * @desc    Get all batches with filters, search, pagination, and sorting
 * @route   GET /api/v1/batches
 * @access  Public / Private ('inventory.view')
 */
const getBatches = asyncHandler(async (req, res) => {
  const {
    search,
    q,
    status,
    medicineId,
    sortBy = 'expiryDate',
    sortOrder = 'asc',
    order,
    page = 1,
    limit,
    paginate,
  } = req.query;

  const filter = {};

  // Filter by medicine (accepts ObjectId or string code like MED-1001)
  if (medicineId && medicineId !== 'all') {
    if (mongoose.Types.ObjectId.isValid(medicineId)) {
      filter.$or = [{ medicineId: medicineId }, { medicineCode: medicineId }];
    } else {
      const parentMed = await Medicine.findOne({ medicineId });
      if (parentMed) {
        filter.$or = [{ medicineId: parentMed._id }, { medicineCode: medicineId }];
      } else {
        filter.medicineCode = medicineId;
      }
    }
  }

  // Filter by status
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Search keyword (batchNumber, supplier, rack, shelf)
  const queryStr = (search || q || '').trim();
  if (queryStr) {
    const searchRegex = { $regex: queryStr, $options: 'i' };
    const searchConditions = [
      { batchNumber: searchRegex },
      { supplier: searchRegex },
      { rack: searchRegex },
      { shelf: searchRegex },
      { location: searchRegex },
      { batchId: searchRegex },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  // Sorting
  const sortDirection = (order || sortOrder).toLowerCase() === 'desc' ? -1 : 1;
  const sortOptions = {};
  sortOptions[sortBy] = sortDirection;

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const isPaginationRequested = limit !== undefined && limit !== 'all' && parseInt(limit, 10) > 0;
  const limitNum = isPaginationRequested ? parseInt(limit, 10) : 0;

  const total = await Batch.countDocuments(filter);

  let query = Batch.find(filter)
    .populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert')
    .sort(sortOptions);

  if (limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const batches = await query;
  const enrichedBatches = batches.map(enrichBatch);

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
    return ApiResponse.success(res, 'Batches retrieved successfully', {
      batches: enrichedBatches,
      pagination: paginationData,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Batches retrieved successfully',
    data: enrichedBatches,
    pagination: paginationData,
    count: enrichedBatches.length,
  });
});

/**
 * @desc    Get all batches for a specific medicine
 * @route   GET /api/v1/batches/medicine/:medicineId
 * @access  Public / Private
 */
const getBatchesByMedicine = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;

  let queryFilter;
  if (mongoose.Types.ObjectId.isValid(medicineId)) {
    queryFilter = { $or: [{ medicineId: medicineId }, { medicineCode: medicineId }] };
  } else {
    const med = await Medicine.findOne({ medicineId });
    if (!med) {
      return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
    }
    queryFilter = { $or: [{ medicineId: med._id }, { medicineCode: med.medicineId }] };
  }

  const batches = await Batch.find(queryFilter)
    .populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert')
    .sort({ expiryDate: 1 });

  const enriched = batches.map(enrichBatch);
  return ApiResponse.success(res, 'Medicine batches retrieved', enriched);
});

/**
 * @desc    Get near-expiry batches
 * @route   GET /api/v1/batches/near-expiry
 * @access  Public / Private
 */
const getNearExpiryBatches = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 60;
  const now = new Date();
  const thresholdDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const batches = await Batch.find({
    expiryDate: { $gte: now, $lte: thresholdDate },
  })
    .populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert')
    .sort({ expiryDate: 1 });

  const enriched = batches.map(enrichBatch);
  return ApiResponse.success(
    res,
    `Found ${enriched.length} batches expiring within ${days} days`,
    enriched
  );
});

/**
 * @desc    Get expired batches
 * @route   GET /api/v1/batches/expired
 * @access  Public / Private
 */
const getExpiredBatches = asyncHandler(async (req, res) => {
  const now = new Date();

  const batches = await Batch.find({
    expiryDate: { $lt: now },
  })
    .populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert')
    .sort({ expiryDate: 1 });

  const enriched = batches.map(enrichBatch);
  return ApiResponse.success(res, `Found ${enriched.length} expired batches`, enriched);
});

/**
 * @desc    Get single batch details by ID (ObjectId or batchId)
 * @route   GET /api/v1/batches/:id
 * @access  Public / Private
 */
const getBatchById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { batchId: id }] } : { batchId: id };

  const batch = await Batch.findOne(query).populate(
    'medicineId',
    'name genericName brand formula strength type category medicineId minStockAlert'
  );

  if (!batch) {
    return ApiResponse.error(res, 'Batch not found', ['No batch matches identifier'], 404);
  }

  return ApiResponse.success(res, 'Batch details retrieved', enrichBatch(batch));
});

/**
 * @desc    Add new batch to medicine
 * @route   POST /api/v1/batches
 * @access  Private ('inventory.add')
 */
const createBatch = asyncHandler(async (req, res) => {
  const {
    medicineId,
    batchNumber,
    manufacturingDate,
    expiryDate,
    purchasePrice,
    sellingPrice,
    quantity,
    rack,
    shelf,
    supplier,
  } = req.body;

  if (!medicineId || !batchNumber || !manufacturingDate || !expiryDate || quantity === undefined) {
    return ApiResponse.error(
      res,
      'medicineId, batchNumber, manufacturingDate, expiryDate, and quantity are required.',
      ['Missing required batch fields'],
      400
    );
  }

  // Validate date logic
  const mfg = new Date(manufacturingDate);
  const exp = new Date(expiryDate);
  if (isNaN(mfg.getTime()) || isNaN(exp.getTime())) {
    return ApiResponse.error(
      res,
      'Invalid manufacturingDate or expiryDate format.',
      ['Invalid date values'],
      400
    );
  }
  if (mfg > exp) {
    return ApiResponse.error(
      res,
      'Validation Error: Manufacturing date cannot be after expiry date.',
      ['manufacturingDate > expiryDate'],
      400
    );
  }

  // Resolve parent medicine (accepts ObjectId or string code like MED-1001)
  const isObjectId = mongoose.Types.ObjectId.isValid(medicineId);
  const medQuery = isObjectId ? { $or: [{ _id: medicineId }, { medicineId }] } : { medicineId };
  let medicine = await Medicine.findOne(medQuery);

  if (!medicine && req.body.medicineCode) {
    medicine = await Medicine.findOne({ medicineId: req.body.medicineCode });
  }

  // If medicine doesn't exist in DB, create it automatically so the batch is always stored
  if (!medicine) {
    const medCode =
      req.body.medicineCode ||
      (String(medicineId).startsWith('MED-')
        ? medicineId
        : `MED-${Math.floor(1000 + Math.random() * 9000)}`);
    const medName = req.body.medicineName || req.body.name || `Medicine ${medCode}`;
    medicine = await Medicine.create({
      medicineId: medCode,
      name: medName,
      genericName: req.body.genericName || medName,
      brand: req.body.brand || medName,
      type: req.body.type || 'Tablet',
      category: req.body.category || 'General',
      formula: req.body.formula || 'Standard Formulation',
      strength: req.body.strength || '500mg',
      sellingPrice: req.body.sellingPrice || 0,
      purchasePrice: req.body.purchasePrice || 0,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });
  }

  const pPrice = purchasePrice !== undefined ? Number(purchasePrice) : medicine.purchasePrice || 0;
  const sPrice = sellingPrice !== undefined ? Number(sellingPrice) : medicine.sellingPrice || 0;
  const qty = Math.max(0, Number(quantity));

  // Business Rule: If batch with same batchNumber already exists for medicine, update its stock
  const existing = await Batch.findOne({
    medicineId: medicine._id,
    batchNumber: batchNumber.trim(),
  });
  if (existing) {
    existing.quantity += qty;
    if (purchasePrice !== undefined) existing.purchasePrice = pPrice;
    if (sellingPrice !== undefined) existing.sellingPrice = sPrice;
    if (rack) existing.rack = rack.trim();
    if (shelf) existing.shelf = shelf.trim();
    if (exp) existing.expiryDate = exp;
    if (mfg) existing.manufacturingDate = mfg;
    existing.updatedBy = req.user?._id || null;
    await existing.save();

    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: medicine.medicineId,
      batchId: existing.batchId,
      previousQuantity: existing.quantity - qty,
      changedQuantity: qty,
      newQuantity: existing.quantity,
      actionType: 'Add Stock',
      employeeId: req.user?.username || 'STAFF-01',
      employeeName: req.user?.name || 'Staff Pharmacist',
      reason: req.body.reason?.trim() || `Added stock to existing batch (${existing.batchNumber})`,
    });

    await existing.populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert');
    return ApiResponse.success(res, `Batch '${existing.batchNumber}' stock updated successfully`, enrichBatch(existing));
  }

  // Generate unique batchId e.g. BAT-1006
  const count = await Batch.countDocuments();
  let batchId = req.body.batchId;
  if (!batchId) {
    batchId = `BAT-${1001 + count}`;
  }
  let exists = await Batch.findOne({ batchId });
  if (exists) {
    batchId = `BAT-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
  }

  const batch = await Batch.create({
    batchId,
    medicineId: medicine._id,
    medicineCode: medicine.medicineId,
    batchNumber: batchNumber.trim(),
    manufacturingDate: mfg,
    expiryDate: exp,
    purchasePrice: pPrice,
    sellingPrice: sPrice,
    quantity: qty,
    rack: rack?.trim() || medicine.rack || 'Rack A-1',
    shelf: shelf?.trim() || medicine.shelf || 'Shelf 1',
    supplier: supplier?.trim() || '',
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
  });

  // Record Stock History log
  await StockHistory.create({
    stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    medicineId: medicine.medicineId,
    batchId: batch.batchId,
    previousQuantity: 0,
    changedQuantity: qty,
    newQuantity: qty,
    actionType: 'Add Stock',
    employeeId: req.user?.username || 'STAFF-01',
    employeeName: req.user?.name || 'Staff Pharmacist',
    reason: `Initial batch receipt (${batch.batchNumber})`,
  });

  await batch.populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert');

  return ApiResponse.created(res, `Batch '${batch.batchNumber}' added successfully`, enrichBatch(batch));
});

/**
 * @desc    Update batch details
 * @route   PUT /api/v1/batches/:id
 * @access  Private ('inventory.edit')
 */
const updateBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { batchId: id }] } : { batchId: id };

  const batch = await Batch.findOne(query);

  if (!batch) {
    return ApiResponse.error(res, 'Batch not found', ['No batch matches identifier'], 404);
  }

  const {
    batchNumber,
    manufacturingDate,
    expiryDate,
    purchasePrice,
    sellingPrice,
    quantity,
    rack,
    shelf,
    supplier,
  } = req.body;

  // Validate dates if modified
  const mfg = manufacturingDate ? new Date(manufacturingDate) : batch.manufacturingDate;
  const exp = expiryDate ? new Date(expiryDate) : batch.expiryDate;
  if (mfg && exp && mfg > exp) {
    return ApiResponse.error(
      res,
      'Validation Error: Manufacturing date cannot be after expiry date.',
      ['manufacturingDate > expiryDate'],
      400
    );
  }

  // Validate duplicate batchNumber within the same medicine
  if (batchNumber && batchNumber.trim() !== batch.batchNumber) {
    const duplicate = await Batch.findOne({
      _id: { $ne: batch._id },
      medicineId: batch.medicineId,
      batchNumber: batchNumber.trim(),
    });
    if (duplicate) {
      return ApiResponse.error(
        res,
        `Batch number '${batchNumber}' already exists for this medicine.`,
        ['Duplicate batchNumber'],
        409
      );
    }
    batch.batchNumber = batchNumber.trim();
  }

  // Handle quantity adjustment & stock history
  if (quantity !== undefined && Number(quantity) !== batch.quantity) {
    const prevQty = batch.quantity;
    const newQty = Math.max(0, Number(quantity));
    const diff = newQty - prevQty;

    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: batch.medicineCode || batch.medicineId.toString(),
      batchId: batch.batchId,
      previousQuantity: prevQty,
      changedQuantity: diff,
      newQuantity: newQty,
      actionType: 'Update Stock',
      employeeId: req.user?.username || 'STAFF-01',
      employeeName: req.user?.name || 'Staff Pharmacist',
      reason: req.body.reason || 'Manual batch quantity correction',
    });

    batch.quantity = newQty;
  }

  if (manufacturingDate) batch.manufacturingDate = mfg;
  if (expiryDate) batch.expiryDate = exp;
  if (purchasePrice !== undefined) batch.purchasePrice = Math.max(0, Number(purchasePrice));
  if (sellingPrice !== undefined) batch.sellingPrice = Math.max(0, Number(sellingPrice));
  if (rack !== undefined) batch.rack = rack.trim();
  if (shelf !== undefined) batch.shelf = shelf.trim();
  if (supplier !== undefined) batch.supplier = supplier.trim();

  batch.updatedBy = req.user?._id || null;

  await batch.save();
  await batch.populate('medicineId', 'name genericName brand formula strength type category medicineId minStockAlert');

  return ApiResponse.success(res, `Batch '${batch.batchNumber}' updated successfully`, enrichBatch(batch));
});

/**
 * @desc    Delete batch
 * @route   DELETE /api/v1/batches/:id
 * @access  Private ('inventory.delete')
 * @note    Business Rule: Do not delete batches with sales history.
 */
const deleteBatch = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { batchId: id }] } : { batchId: id };

  const batch = await Batch.findOne(query);

  if (!batch) {
    return ApiResponse.error(res, 'Batch not found', ['No batch matches identifier'], 404);
  }

  // Business Rule: Do not delete batches with sales history
  const hasSalesHistory = await Sale.exists({
    $or: [
      { 'items.batchId': batch.batchId },
      { 'items.batchId': batch._id.toString() },
      { 'items.batchNumber': batch.batchNumber },
    ],
  });

  if (hasSalesHistory) {
    return ApiResponse.error(
      res,
      `Operation Denied: Cannot delete batch '${batch.batchNumber}' because it has recorded sales history. Disposal or stock adjustment must be logged instead to preserve legal pharmacy audit records.`,
      ['Batch has historical sales references'],
      400
    );
  }

  // Log stock removal if quantity > 0
  if (batch.quantity > 0) {
    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: batch.medicineCode || batch.medicineId.toString(),
      batchId: batch.batchId,
      previousQuantity: batch.quantity,
      changedQuantity: -batch.quantity,
      newQuantity: 0,
      actionType: 'Disposal / Waste',
      employeeId: req.user?.username || 'STAFF-01',
      employeeName: req.user?.name || 'Staff Pharmacist',
      reason: req.body?.reason || 'Batch permanently deleted/discarded',
    });
  }

  await batch.deleteOne();

  return ApiResponse.success(res, `Batch '${batch.batchNumber}' deleted successfully`, {
    deleted: true,
    batchId: batch.batchId,
    batchNumber: batch.batchNumber,
  });
});

module.exports = {
  getBatches,
  getBatchesByMedicine,
  getNearExpiryBatches,
  getExpiredBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
};
