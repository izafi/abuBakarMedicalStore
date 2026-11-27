const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const { MEDICINE_TYPES } = Medicine;

/**
 * @desc    Get all medicines with search, category/type filter, sorting & pagination
 * @route   GET /api/v1/medicines
 * @access  Public / Private ('medicines.view')
 */
const getMedicines = asyncHandler(async (req, res) => {
  const {
    search,
    q,
    category,
    type,
    isActive,
    sortBy = 'name',
    sortOrder = 'asc',
    order,
    page = 1,
    limit,
    paginate,
  } = req.query;

  const filter = {};

  // Status filtering (default to active only unless explicitly requesting 'all' or 'false')
  if (isActive === 'all') {
    // No filter on isActive
  } else if (isActive === 'false') {
    filter.isActive = false;
  } else {
    filter.isActive = { $ne: false };
  }

  // Category filter
  if (category && category !== 'all') {
    filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
  }

  // Type filter
  if (type && type !== 'all') {
    filter.type = type.trim();
  }

  // Search keyword (search name, genericName, brand, formula, strength, medicineId)
  const queryStr = (search || q || '').trim();
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

  // Sorting
  const sortDirection = (order || sortOrder).toLowerCase() === 'desc' ? -1 : 1;
  const sortOptions = {};
  const allowedSortFields = ['name', 'genericName', 'category', 'type', 'sellingPrice', 'purchasePrice', 'createdAt'];
  if (allowedSortFields.includes(sortBy)) {
    sortOptions[sortBy] = sortDirection;
  } else {
    sortOptions['name'] = 1;
  }

  // Pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const isPaginationRequested = limit !== undefined && limit !== 'all' && parseInt(limit, 10) > 0;
  const limitNum = isPaginationRequested ? parseInt(limit, 10) : 0;

  const total = await Medicine.countDocuments(filter);

  let query = Medicine.find(filter).sort(sortOptions);
  if (limitNum > 0) {
    query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
  }

  const medicines = await query;

  // Enrich with dynamic batch quantities (Medicine model never stores batch quantities)
  const medObjectIds = medicines.map((m) => m._id);
  const medIds = medicines.map((m) => m.medicineId);
  const batches = await Batch.find({
    $or: [
      { medicineId: { $in: medObjectIds } },
      { medicineCode: { $in: medIds } },
    ],
  });

  const enrichedMedicines = medicines.map((m) => {
    const medBatches = batches.filter(
      (b) =>
        (b.medicineId && b.medicineId.toString() === m._id.toString()) ||
        b.medicineCode === m.medicineId
    );
    const availableStock = medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    return {
      ...m.toObject(),
      id: m._id,
      availableStock,
      batchesCount: medBatches.length,
      batches: medBatches,
    };
  });

  const totalPages = limitNum > 0 ? Math.ceil(total / limitNum) : 1;
  const paginationData = {
    total,
    page: pageNum,
    limit: limitNum > 0 ? limitNum : total,
    pages: totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
  };

  // If explicit pagination requested in query param
  if (paginate === 'true') {
    return ApiResponse.success(res, 'Medicines retrieved successfully', {
      medicines: enrichedMedicines,
      pagination: paginationData,
    });
  }

  // Deliver array directly in data for seamless frontend mapping, with pagination metadata
  return res.status(200).json({
    success: true,
    message: 'Medicines retrieved successfully',
    data: enrichedMedicines,
    pagination: paginationData,
    count: enrichedMedicines.length,
  });
});

/**
 * @desc    Dedicated instant search endpoint for medicines
 * @route   GET /api/v1/medicines/search
 * @access  Public / Private
 */
const searchMedicines = asyncHandler(async (req, res) => {
  const queryStr = (req.query.q || req.query.query || req.query.search || '').trim();

  if (!queryStr) {
    return ApiResponse.success(res, 'Empty search query returned 0 results', []);
  }

  const searchRegex = { $regex: queryStr, $options: 'i' };
  const filter = {
    isActive: { $ne: false },
    $or: [
      { name: searchRegex },
      { genericName: searchRegex },
      { brand: searchRegex },
      { formula: searchRegex },
      { strength: searchRegex },
      { category: searchRegex },
      { medicineId: searchRegex },
    ],
  };

  const medicines = await Medicine.find(filter).sort({ name: 1 }).limit(30);

  // Dynamically compute available stock from Batch collection
  const medObjectIds = medicines.map((m) => m._id);
  const medIds = medicines.map((m) => m.medicineId);
  const batches = await Batch.find({
    $or: [
      { medicineId: { $in: medObjectIds } },
      { medicineCode: { $in: medIds } },
    ],
  });

  const enriched = medicines.map((m) => {
    const medBatches = batches.filter(
      (b) =>
        (b.medicineId && b.medicineId.toString() === m._id.toString()) ||
        b.medicineCode === m.medicineId
    );
    const availableStock = medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    return {
      ...m.toObject(),
      id: m._id,
      availableStock,
      batchesCount: medBatches.length,
      batches: medBatches,
    };
  });

  return ApiResponse.success(res, `Found ${enriched.length} matching medicines`, enriched);
});

const DEFAULT_CATEGORIES = [
  'Analgesic / Anti-inflammatory',
  'Analgesics / Antipyretics',
  'Anti-inflammatory',
  'Anti-inflammatory / Antibacterial',
  'Antibacterial',
  'Antibiotics',
  'Antidiabetic',
  'Antifungal',
  'Antihistamines',
  'Antiseptics & Disinfectants',
  'Antiviral',
  'Cardiovascular',
  'Dermatological',
  'Gastrointestinal',
  'Hormones & Endocrine',
  'Neurological / Psychiatric',
  'NSAIDs',
  'Ophthalmic / Otic',
  'Respiratory',
  'Vitamins & Supplements',
  'Other',
];

/**
 * @desc    Get all distinct medicine categories
 * @route   GET /api/v1/medicines/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Medicine.distinct('category', { isActive: { $ne: false } });
  const cleaned = categories.filter((c) => c && c.trim() !== '');
  const merged = Array.from(new Set([...cleaned, ...DEFAULT_CATEGORIES])).sort();
  return ApiResponse.success(res, 'Medicine categories retrieved', merged);
});

/**
 * @desc    Get list of supported medicine dosage types
 * @route   GET /api/v1/medicines/types
 * @access  Public
 */
const getTypes = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 'Medicine dosage types retrieved', MEDICINE_TYPES);
});

/**
 * @desc    Get single medicine details by ID (ObjectId or medicineId) with batch breakdown
 * @route   GET /api/v1/medicines/:id
 * @access  Public / Private ('medicines.view')
 */
const getMedicineById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { medicineId: id }] } : { medicineId: id };

  const medicine = await Medicine.findOne(query);

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  const batches = await Batch.find({
    $or: [
      { medicineId: medicine._id },
      { medicineCode: medicine.medicineId },
    ],
  }).sort({ expiryDate: 1 });
  const availableStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  return ApiResponse.success(res, 'Medicine details retrieved', {
    ...medicine.toObject(),
    id: medicine._id,
    availableStock,
    totalStock: availableStock,
    batchesCount: batches.length,
    batches,
  });
});

/**
 * @desc    Add new medicine
 * @route   POST /api/v1/medicines
 * @access  Private ('medicines.add')
 */
const createMedicine = asyncHandler(async (req, res) => {
  const {
    name,
    genericName,
    brand,
    formula,
    strength,
    type = 'Tablet',
    category = 'General',
    usage,
    manufacturer,
    sellingPrice,
    purchasePrice,
    rack,
    shelf,
    minStockAlert,
  } = req.body;

  if (!name || !genericName || !strength) {
    return ApiResponse.error(
      res,
      'Name, genericName, and strength are required fields.',
      ['Missing required medicine fields'],
      400
    );
  }

  if (type && !MEDICINE_TYPES.includes(type)) {
    return ApiResponse.error(
      res,
      `Invalid medicine type '${type}'. Allowed types: ${MEDICINE_TYPES.join(', ')}`,
      ['Invalid type'],
      400
    );
  }

  // Auto-generate unique medicineId e.g. MED-1006
  let medicineId = req.body.medicineId;
  if (!medicineId) {
    const count = await Medicine.countDocuments();
    medicineId = `MED-${1001 + count}`;
    // Guard against collision
    let exists = await Medicine.findOne({ medicineId });
    if (exists) {
      medicineId = `MED-${1001 + count}-${Date.now().toString().slice(-4)}`;
    }
  } else {
    const exists = await Medicine.findOne({ medicineId: medicineId.trim() });
    if (exists) {
      return ApiResponse.error(
        res,
        `Medicine ID '${medicineId}' is already in use.`,
        ['Duplicate medicineId'],
        409
      );
    }
  }

  const medicine = await Medicine.create({
    medicineId: medicineId.trim(),
    name: name.trim(),
    genericName: genericName.trim(),
    brand: brand?.trim() || '',
    formula: formula?.trim() || '',
    strength: strength.trim(),
    type,
    category: category.trim(),
    usage: usage?.trim() || '',
    manufacturer: manufacturer?.trim() || '',
    isActive: true,
    createdBy: req.user?._id || null,
    updatedBy: req.user?._id || null,
    sellingPrice: sellingPrice !== undefined ? Math.max(0, Number(sellingPrice)) : 0,
    purchasePrice: purchasePrice !== undefined ? Math.max(0, Number(purchasePrice)) : 0,
    rack: rack?.trim() || 'Rack A-1',
    shelf: shelf?.trim() || 'Shelf 1',
    minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : 15,
  });

  return ApiResponse.created(res, `Medicine '${medicine.name}' created successfully`, medicine);
});

/**
 * @desc    Update medicine details
 * @route   PUT /api/v1/medicines/:id
 * @access  Private ('medicines.edit')
 */
const updateMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { medicineId: id }] } : { medicineId: id };

  const medicine = await Medicine.findOne(query);

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  const {
    name,
    genericName,
    brand,
    formula,
    strength,
    type,
    category,
    usage,
    manufacturer,
    isActive,
    sellingPrice,
    purchasePrice,
    rack,
    shelf,
    minStockAlert,
  } = req.body;

  if (type !== undefined && !MEDICINE_TYPES.includes(type)) {
    return ApiResponse.error(
      res,
      `Invalid medicine type '${type}'. Allowed types: ${MEDICINE_TYPES.join(', ')}`,
      ['Invalid type'],
      400
    );
  }

  if (name !== undefined) medicine.name = name.trim();
  if (genericName !== undefined) medicine.genericName = genericName.trim();
  if (brand !== undefined) medicine.brand = brand.trim();
  if (formula !== undefined) medicine.formula = formula.trim();
  if (strength !== undefined) medicine.strength = strength.trim();
  if (type !== undefined) medicine.type = type;
  if (category !== undefined) medicine.category = category.trim();
  if (usage !== undefined) medicine.usage = usage.trim();
  if (manufacturer !== undefined) medicine.manufacturer = manufacturer.trim();
  if (isActive !== undefined) medicine.isActive = Boolean(isActive);
  if (sellingPrice !== undefined) medicine.sellingPrice = Math.max(0, Number(sellingPrice));
  if (purchasePrice !== undefined) medicine.purchasePrice = Math.max(0, Number(purchasePrice));
  if (rack !== undefined) medicine.rack = rack.trim();
  if (shelf !== undefined) medicine.shelf = shelf.trim();
  if (minStockAlert !== undefined) medicine.minStockAlert = Number(minStockAlert);

  medicine.updatedBy = req.user?._id || null;

  await medicine.save();

  // If rack or shelf were updated, also update linked batches location
  if (rack !== undefined || shelf !== undefined) {
    const batchUpdate = {};
    if (rack !== undefined) batchUpdate.rack = medicine.rack;
    if (shelf !== undefined) batchUpdate.shelf = medicine.shelf;
    batchUpdate.location = `${medicine.rack || 'Rack A-1'}, ${medicine.shelf || 'Shelf 1'}`;

    await Batch.updateMany(
      { $or: [{ medicineId: medicine._id }, { medicineCode: medicine.medicineId }] },
      { $set: batchUpdate }
    );
  }

  return ApiResponse.success(res, `Medicine '${medicine.name}' updated successfully`, medicine);
});

/**
 * @desc    Delete or safely archive medicine
 * @route   DELETE /api/v1/medicines/:id
 * @access  Private ('medicines.delete')
 * @note    Do not permanently delete medicines having historical batch or sales references. Use soft deletion.
 */
const deleteMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Rule: Only administrators are authorized to delete medicines
  if (req.user && req.user.role !== 'Admin') {
    return ApiResponse.error(
      res,
      'Operation Denied: Only administrators are authorized to delete medicines from the catalog.',
      ['Administrator privileges required'],
      403
    );
  }

  const isObjectId = mongoose.Types.ObjectId.isValid(id);
  const query = isObjectId ? { $or: [{ _id: id }, { medicineId: id }] } : { medicineId: id };

  const medicine = await Medicine.findOne(query);

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  // Remove all linked batches for this medicine
  await Batch.deleteMany({
    $or: [{ medicineId: medicine._id }, { medicineCode: medicine.medicineId }],
  });

  // Permanently remove the medicine
  await medicine.deleteOne();

  return ApiResponse.success(res, `Medicine '${medicine.name}' and its stock batches deleted successfully.`, {
    archived: false,
    deleted: true,
    id: medicine._id,
    medicineId: medicine.medicineId,
    name: medicine.name,
  });
});

module.exports = {
  getMedicines,
  getMedicineById,
  searchMedicines,
  getCategories,
  getTypes,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
