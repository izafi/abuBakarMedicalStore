const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper to fetch sellable (non-expired, positive quantity) batches for medicines
 */
const getSellableBatches = async (medicineIds, medicineCodes = []) => {
  const now = new Date();
  return await Batch.find({
    $or: [
      { medicineId: { $in: medicineIds } },
      { medicineCode: { $in: medicineCodes } },
    ],
    quantity: { $gt: 0 },
    expiryDate: { $gte: now }, // Strictly exclude expired batches from sale availability
  }).sort({ expiryDate: 1 }); // FIFO: Earliest expiry date first
};

/**
 * @desc    Instant counter search across name, genericName, brand, formula, strength
 * @route   GET /api/v1/medicines/search
 * @access  Public / Private
 */
const searchCounterMedicines = asyncHandler(async (req, res) => {
  const queryStr = (req.query.q || req.query.query || req.query.search || '').trim();

  const filter = { isActive: { $ne: false } };

  if (queryStr) {
    const searchRegex = { $regex: queryStr, $options: 'i' };
    filter.$or = [
      { name: searchRegex },
      { genericName: searchRegex },
      { brand: searchRegex },
      { formula: searchRegex },
      { strength: searchRegex },
      { category: searchRegex },
      { medicineId: searchRegex },
    ];
  }

  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const medicines = await Medicine.find(filter).sort({ name: 1 }).limit(limit);

  const medObjectIds = medicines.map((m) => m._id);
  const medCodes = medicines.map((m) => m.medicineId);

  // Fetch sellable batches only
  const sellableBatches = await getSellableBatches(medObjectIds, medCodes);

  const counterResults = medicines.map((med) => {
    const matchingBatches = sellableBatches.filter(
      (b) =>
        (b.medicineId && b.medicineId.toString() === med._id.toString()) ||
        b.medicineCode === med.medicineId
    );

    const availableQuantity = matchingBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const lowStockThreshold = med.minStockAlert || 15;
    const defaultBatch = matchingBatches[0]; // Earliest expiring valid batch

    return {
      _id: med._id,
      id: med._id,
      medicineId: med.medicineId,
      name: med.name,
      genericName: med.genericName,
      brand: med.brand || '',
      formula: med.formula || '',
      strength: med.strength,
      type: med.type,
      category: med.category,
      usage: med.usage || '',
      rack: defaultBatch?.rack || med.rack || 'Rack A-1',
      shelf: defaultBatch?.shelf || med.shelf || 'Shelf 1',
      sellingPrice: defaultBatch?.sellingPrice || med.sellingPrice || 0,
      availableQuantity,
      availableStock: availableQuantity,
      lowStockWarning: availableQuantity <= lowStockThreshold,
      hasAvailableStock: availableQuantity > 0,
      batchesCount: matchingBatches.length,
      availableBatches: matchingBatches.map((b) => ({
        batchId: b.batchId,
        id: b._id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        sellingPrice: b.sellingPrice,
        purchasePrice: b.purchasePrice,
        availableQuantity: b.quantity,
        rack: b.rack,
        shelf: b.shelf,
        location: b.location,
      })),
    };
  });

  return ApiResponse.success(res, `Found ${counterResults.length} medicines matching '${queryStr}'`, counterResults);
});

/**
 * @desc    Get detailed medicine info with usage and sellable batches for Counter selection
 * @route   GET /api/v1/medicines/:id/details
 * @access  Public / Private
 */
const getMedicineCounterDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { medicineId: id }] } : { medicineId: id };

  const med = await Medicine.findOne(query);
  if (!med) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  // Fetch sellable batches for this medicine
  const sellableBatches = await getSellableBatches([med._id], [med.medicineId]);
  const availableQuantity = sellableBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const lowStockThreshold = med.minStockAlert || 15;
  const defaultBatch = sellableBatches[0];

  const responseData = {
    _id: med._id,
    id: med._id,
    medicineId: med.medicineId,
    name: med.name,
    genericName: med.genericName,
    brand: med.brand || '',
    formula: med.formula || '',
    strength: med.strength,
    type: med.type,
    category: med.category,
    usage: med.usage || '',
    manufacturer: med.manufacturer || '',
    rack: defaultBatch?.rack || med.rack || 'Rack A-1',
    shelf: defaultBatch?.shelf || med.shelf || 'Shelf 1',
    sellingPrice: defaultBatch?.sellingPrice || med.sellingPrice || 0,
    availableQuantity,
    availableStock: availableQuantity,
    lowStockWarning: availableQuantity <= lowStockThreshold,
    hasAvailableStock: availableQuantity > 0,
    batchesCount: sellableBatches.length,
    availableBatches: sellableBatches.map((b) => ({
      batchId: b.batchId,
      id: b._id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      sellingPrice: b.sellingPrice,
      purchasePrice: b.purchasePrice,
      availableQuantity: b.quantity,
      rack: b.rack,
      shelf: b.shelf,
      location: b.location,
    })),
  };

  return ApiResponse.success(res, `Details for medicine '${med.name}' retrieved`, responseData);
});

/**
 * @desc    Get all available non-expired batches for a specific medicine (Ready for sale selection)
 * @route   GET /api/v1/medicines/:id/available-batches
 * @access  Public / Private
 */
const getAvailableBatches = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { medicineId: id }] } : { medicineId: id };

  const med = await Medicine.findOne(query);
  if (!med) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  // Strictly non-expired and positive quantity
  const sellableBatches = await getSellableBatches([med._id], [med.medicineId]);

  const batchesData = sellableBatches.map((b) => ({
    batchId: b.batchId,
    id: b._id,
    batchNumber: b.batchNumber,
    expiryDate: b.expiryDate,
    sellingPrice: b.sellingPrice,
    purchasePrice: b.purchasePrice,
    availableQuantity: b.quantity,
    rack: b.rack,
    shelf: b.shelf,
    location: b.location,
    medicineName: med.name,
    medicineId: med.medicineId,
  }));

  return ApiResponse.success(res, `Retrieved ${batchesData.length} available batches for '${med.name}'`, batchesData);
});

/**
 * @desc    Medicine Counter Paginated Fast Catalog
 * @route   GET /api/v1/medicines/counter/catalog
 * @access  Public / Private
 */
const getCounterCatalog = asyncHandler(async (req, res) => {
  const {
    q,
    search,
    category,
    type,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'asc',
  } = req.query;

  const filter = { isActive: { $ne: false } };

  const queryStr = (q || search || '').trim();
  if (queryStr) {
    const searchRegex = { $regex: queryStr, $options: 'i' };
    filter.$or = [
      { name: searchRegex },
      { genericName: searchRegex },
      { brand: searchRegex },
      { formula: searchRegex },
      { strength: searchRegex },
      { category: searchRegex },
      { medicineId: searchRegex },
    ];
  }

  if (category && category !== 'all') {
    filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
  }

  if (type && type !== 'all') {
    filter.type = type.trim();
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  const total = await Medicine.countDocuments(filter);

  const medicines = await Medicine.find(filter)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const medObjectIds = medicines.map((m) => m._id);
  const medCodes = medicines.map((m) => m.medicineId);

  // Fetch sellable batches for all medicines on current page in a single query
  const sellableBatches = await getSellableBatches(medObjectIds, medCodes);

  const catalogItems = medicines.map((med) => {
    const matchingBatches = sellableBatches.filter(
      (b) =>
        (b.medicineId && b.medicineId.toString() === med._id.toString()) ||
        b.medicineCode === med.medicineId
    );

    const availableQuantity = matchingBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    const lowStockThreshold = med.minStockAlert || 15;
    const defaultBatch = matchingBatches[0];

    return {
      _id: med._id,
      id: med._id,
      medicineId: med.medicineId,
      name: med.name,
      genericName: med.genericName,
      brand: med.brand || '',
      formula: med.formula || '',
      strength: med.strength,
      type: med.type,
      category: med.category,
      usage: med.usage || '',
      rack: defaultBatch?.rack || med.rack || 'Rack A-1',
      shelf: defaultBatch?.shelf || med.shelf || 'Shelf 1',
      sellingPrice: defaultBatch?.sellingPrice || med.sellingPrice || 0,
      availableQuantity,
      availableStock: availableQuantity,
      lowStockWarning: availableQuantity <= lowStockThreshold,
      hasAvailableStock: availableQuantity > 0,
      batchesCount: matchingBatches.length,
      availableBatches: matchingBatches.map((b) => ({
        batchId: b.batchId,
        id: b._id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        sellingPrice: b.sellingPrice,
        purchasePrice: b.purchasePrice,
        availableQuantity: b.quantity,
        rack: b.rack,
        shelf: b.shelf,
        location: b.location,
      })),
    };
  });

  const totalPages = Math.ceil(total / limitNum);

  return ApiResponse.success(res, 'Medicine counter catalog retrieved', {
    medicines: catalogItems,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  });
});

module.exports = {
  searchCounterMedicines,
  getMedicineCounterDetails,
  getAvailableBatches,
  getCounterCatalog,
};
