const Batch = require('../models/Batch');
const Medicine = require('../models/Medicine');
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
 * @desc    Get all batches with filters
 * @route   GET /api/v1/batches
 * @access  Public / Private ('inventory.view')
 */
const getBatches = asyncHandler(async (req, res) => {
  const { search, status, medicineId } = req.query;
  const filter = {};

  if (medicineId) {
    filter.medicineId = medicineId;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search && search.trim()) {
    filter.$or = [
      { batchNumber: { $regex: search.trim(), $options: 'i' } },
      { supplier: { $regex: search.trim(), $options: 'i' } },
      { location: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const batches = await Batch.find(filter).sort({ expiryDate: 1 });

  // Enrich with parent medicine details
  const medIds = [...new Set(batches.map((b) => b.medicineId))];
  const meds = await Medicine.find({ medicineId: { $in: medIds } });
  const medMap = new Map(meds.map((m) => [m.medicineId, m]));

  const enriched = batches.map((b) => {
    const parent = medMap.get(b.medicineId);
    const minAlert = parent ? parent.minStockAlert : 15;
    const computedStatus = computeStatus(b, minAlert);

    return {
      ...b.toObject(),
      status: computedStatus,
      medicineName: parent ? parent.name : 'Unknown Medicine',
      genericName: parent ? parent.genericName : '',
      category: parent ? parent.category : 'General',
      canSell: computedStatus !== 'Expired' && b.quantity > 0,
    };
  });

  return ApiResponse.success(res, 'Batches retrieved successfully', enriched);
});

/**
 * @desc    Get all batches for a specific medicine
 * @route   GET /api/v1/batches/medicine/:medicineId
 * @access  Public / Private
 */
const getBatchesByMedicine = asyncHandler(async (req, res) => {
  const batches = await Batch.find({ medicineId: req.params.medicineId }).sort({ expiryDate: 1 });
  const medicine = await Medicine.findOne({ medicineId: req.params.medicineId });

  const enriched = batches.map((b) => {
    const computedStatus = computeStatus(b, medicine?.minStockAlert || 15);
    return {
      ...b.toObject(),
      status: computedStatus,
      canSell: computedStatus !== 'Expired' && b.quantity > 0,
    };
  });

  return ApiResponse.success(res, 'Medicine batches retrieved', enriched);
});

/**
 * @desc    Get single batch details
 * @route   GET /api/v1/batches/:id
 * @access  Public / Private
 */
const getBatchById = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    $or: [{ _id: req.params.id }, { batchId: req.params.id }],
  });

  if (!batch) {
    return ApiResponse.error(res, 'Batch not found', ['No batch matches identifier'], 404);
  }

  return ApiResponse.success(res, 'Batch details retrieved', batch);
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

  const medicine = await Medicine.findOne({ medicineId });
  if (!medicine) {
    return ApiResponse.error(res, `Parent medicine '${medicineId}' does not exist.`, ['Invalid medicineId'], 404);
  }

  // Check duplicate batch number for same medicine
  const existing = await Batch.findOne({ medicineId, batchNumber: batchNumber.trim() });
  if (existing) {
    return ApiResponse.error(
      res,
      `Batch number '${batchNumber}' already exists for this medicine.`,
      ['Duplicate batch number'],
      409
    );
  }

  const count = await Batch.countDocuments();
  const batchId = req.body.batchId || `BAT-${1001 + count}`;
  const location = `${rack || 'Rack A-1'}, ${shelf || 'Shelf 1'}`;

  const batch = await Batch.create({
    batchId,
    medicineId,
    batchNumber: batchNumber.trim(),
    manufacturingDate: new Date(manufacturingDate),
    expiryDate: new Date(expiryDate),
    purchasePrice: Number(purchasePrice) || medicine.purchasePrice,
    sellingPrice: Number(sellingPrice) || medicine.sellingPrice,
    quantity: Number(quantity),
    rack: rack || 'Rack A-1',
    shelf: shelf || 'Shelf 1',
    location,
    status: 'In Stock',
    supplier: supplier || '',
  });

  // Calculate dynamic status
  batch.status = computeStatus(batch, medicine.minStockAlert);
  await batch.save();

  // Record Stock History log
  await StockHistory.create({
    stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    medicineId,
    batchId,
    previousQuantity: 0,
    changedQuantity: Number(quantity),
    newQuantity: Number(quantity),
    actionType: 'Add Stock',
    employeeId: req.user?.employeeId || 'STAFF-01',
    employeeName: req.user?.name || 'Staff Pharmacist',
    reason: `Initial batch receipt (${batchNumber})`,
  });

  return ApiResponse.created(res, 'Batch added successfully', batch);
});

/**
 * @desc    Update batch details
 * @route   PUT /api/v1/batches/:id
 * @access  Private ('inventory.edit')
 */
const updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    $or: [{ _id: req.params.id }, { batchId: req.params.id }],
  });

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

  if (quantity !== undefined && Number(quantity) !== batch.quantity) {
    const prevQty = batch.quantity;
    const newQty = Number(quantity);
    const diff = newQty - prevQty;

    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: batch.medicineId,
      batchId: batch.batchId,
      previousQuantity: prevQty,
      changedQuantity: diff,
      newQuantity: newQty,
      actionType: 'Update Stock',
      employeeId: req.user?.employeeId || 'STAFF-01',
      employeeName: req.user?.name || 'Staff Pharmacist',
      reason: req.body.reason || 'Manual batch quantity correction',
    });

    batch.quantity = newQty;
  }

  if (batchNumber) batch.batchNumber = batchNumber;
  if (manufacturingDate) batch.manufacturingDate = new Date(manufacturingDate);
  if (expiryDate) batch.expiryDate = new Date(expiryDate);
  if (purchasePrice !== undefined) batch.purchasePrice = Number(purchasePrice);
  if (sellingPrice !== undefined) batch.sellingPrice = Number(sellingPrice);
  if (rack) batch.rack = rack;
  if (shelf) batch.shelf = shelf;
  if (rack || shelf) batch.location = `${batch.rack}, ${batch.shelf}`;
  if (supplier !== undefined) batch.supplier = supplier;

  batch.status = computeStatus(batch);
  await batch.save();

  return ApiResponse.success(res, 'Batch updated successfully', batch);
});

/**
 * @desc    Delete batch
 * @route   DELETE /api/v1/batches/:id
 * @access  Private ('inventory.delete')
 */
const deleteBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findOne({
    $or: [{ _id: req.params.id }, { batchId: req.params.id }],
  });

  if (!batch) {
    return ApiResponse.error(res, 'Batch not found', ['No batch matches identifier'], 404);
  }

  if (batch.quantity > 0) {
    await StockHistory.create({
      stockHistoryId: `HIST-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      medicineId: batch.medicineId,
      batchId: batch.batchId,
      previousQuantity: batch.quantity,
      changedQuantity: -batch.quantity,
      newQuantity: 0,
      actionType: 'Disposal / Waste',
      employeeId: req.user?.employeeId || 'STAFF-01',
      employeeName: req.user?.name || 'Staff Pharmacist',
      reason: req.body.reason || 'Batch deleted / discarded',
    });
  }

  await batch.deleteOne();
  return ApiResponse.success(res, 'Batch deleted successfully', {});
});

module.exports = {
  getBatches,
  getBatchesByMedicine,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
};
