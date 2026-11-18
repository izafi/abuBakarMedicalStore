const Settings = require('../models/Settings');
const Employee = require('../models/Employee');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const seedInitialData = require('../config/seedData');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get store configuration and thresholds
 * @route   GET /api/v1/settings
 * @access  Public / Private
 */
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      storeName: 'Abu Bakar Medical Store',
      branchName: 'Main Branch',
      currency: 'Rs',
      lowStockThreshold: 15,
      nearExpiryDays: 60,
    });
  }

  return ApiResponse.success(res, 'Settings retrieved successfully', settings);
});

/**
 * @desc    Update store settings & thresholds
 * @route   PUT /api/v1/settings
 * @access  Private (requireAdmin)
 */
const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }

  const updatable = [
    'storeName',
    'branchName',
    'tagline',
    'currency',
    'currencySymbol',
    'phone',
    'email',
    'address',
    'licenseNumber',
    'lowStockThreshold',
    'nearExpiryDays',
  ];

  updatable.forEach((key) => {
    if (req.body[key] !== undefined) {
      settings[key] = req.body[key];
    }
  });

  await settings.save();
  return ApiResponse.success(res, 'Store settings updated successfully', settings);
});

/**
 * @desc    Reset all collections back to clean demo seed data
 * @route   POST /api/v1/settings/reset-demo-data
 * @access  Private (requireAdmin)
 */
const resetDemoData = asyncHandler(async (req, res) => {
  // Clear collections
  await Promise.all([
    Employee.deleteMany(),
    Medicine.deleteMany(),
    Batch.deleteMany(),
    Sale.deleteMany(),
    StockHistory.deleteMany(),
    Settings.deleteMany(),
  ]);

  // Re-seed factory demo dataset
  await seedInitialData();

  const settings = await Settings.findOne();
  return ApiResponse.success(res, 'All demo data reset to seed state successfully', settings);
});

module.exports = {
  getSettings,
  updateSettings,
  resetDemoData,
};
