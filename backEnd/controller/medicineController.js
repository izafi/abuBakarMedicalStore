const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all medicines with search, category filter & batch counts
 * @route   GET /api/v1/medicines
 * @access  Public / Private ('medicines.view')
 */
const getMedicines = asyncHandler(async (req, res) => {
  const { search, category, type } = req.query;
  const filter = {};

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (type && type !== 'all') {
    filter.type = type;
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { genericName: { $regex: q, $options: 'i' } },
      { brand: { $regex: q, $options: 'i' } },
      { formula: { $regex: q, $options: 'i' } },
      { medicineId: { $regex: q, $options: 'i' } },
    ];
  }

  const medicines = await Medicine.find(filter).sort({ name: 1 });

  // Enrich medicines with active batch counts and available stock
  const medIds = medicines.map((m) => m.medicineId);
  const batches = await Batch.find({ medicineId: { $in: medIds } });

  const enriched = medicines.map((m) => {
    const medBatches = batches.filter((b) => b.medicineId === m.medicineId);
    const availableStock = medBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    return {
      ...m.toObject(),
      batchesCount: medBatches.length,
      availableStock,
      batches: medBatches,
    };
  });

  return ApiResponse.success(res, 'Medicines retrieved successfully', enriched);
});

/**
 * @desc    Get single medicine details by ID with all batches
 * @route   GET /api/v1/medicines/:id
 * @access  Public / Private ('medicines.view')
 */
const getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({
    $or: [{ _id: req.params.id }, { medicineId: req.params.id }],
  });

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  const batches = await Batch.find({ medicineId: medicine.medicineId }).sort({ expiryDate: 1 });
  const totalStock = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);

  return ApiResponse.success(res, 'Medicine details retrieved', {
    ...medicine.toObject(),
    totalStock,
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
    type,
    category,
    usage,
    manufacturer,
    sellingPrice,
    purchasePrice,
    rack,
    shelf,
    minStockAlert,
  } = req.body;

  if (!name || !genericName || sellingPrice === undefined || purchasePrice === undefined) {
    return ApiResponse.error(
      res,
      'Name, genericName, sellingPrice, and purchasePrice are required.',
      ['Missing required medicine fields'],
      400
    );
  }

  // Generate unique medicineId e.g. MED-1006
  const count = await Medicine.countDocuments();
  const medicineId = req.body.medicineId || `MED-${1001 + count}`;

  const exists = await Medicine.findOne({ medicineId });
  if (exists) {
    return ApiResponse.error(res, `Medicine ID '${medicineId}' already exists`, ['Duplicate medicineId'], 409);
  }

  const medicine = await Medicine.create({
    medicineId,
    name: name.trim(),
    genericName: genericName.trim(),
    brand: brand?.trim() || '',
    formula: formula?.trim() || '',
    strength: strength?.trim() || '',
    type: type || 'Tablet',
    category: category || 'General',
    usage: usage || '',
    manufacturer: manufacturer || '',
    sellingPrice: Number(sellingPrice),
    purchasePrice: Number(purchasePrice),
    rack: rack || 'Rack A',
    shelf: shelf || 'Shelf 1',
    minStockAlert: Number(minStockAlert) || 15,
  });

  return ApiResponse.created(res, 'Medicine added successfully', medicine);
});

/**
 * @desc    Update medicine details
 * @route   PUT /api/v1/medicines/:id
 * @access  Private ('medicines.edit')
 */
const updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({
    $or: [{ _id: req.params.id }, { medicineId: req.params.id }],
  });

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  const fields = [
    'name',
    'genericName',
    'brand',
    'formula',
    'strength',
    'type',
    'category',
    'usage',
    'manufacturer',
    'sellingPrice',
    'purchasePrice',
    'rack',
    'shelf',
    'minStockAlert',
  ];

  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      medicine[f] = req.body[f];
    }
  });

  await medicine.save();
  return ApiResponse.success(res, 'Medicine updated successfully', medicine);
});

/**
 * @desc    Delete medicine and remove associated batches
 * @route   DELETE /api/v1/medicines/:id
 * @access  Private ('medicines.delete')
 */
const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findOne({
    $or: [{ _id: req.params.id }, { medicineId: req.params.id }],
  });

  if (!medicine) {
    return ApiResponse.error(res, 'Medicine not found', ['No medicine matches identifier'], 404);
  }

  // Delete associated batches
  await Batch.deleteMany({ medicineId: medicine.medicineId });
  await medicine.deleteOne();

  return ApiResponse.success(res, 'Medicine and associated batches deleted successfully', {});
});

module.exports = {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
};
