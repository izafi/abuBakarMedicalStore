const Setting = require('../models/Setting');
const Employee = require('../models/Employee');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const StockHistory = require('../models/StockHistory');
const seedInitialData = require('../config/seedData');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Retrieve the Singleton Settings Document (or initialize default)
 */
const getOrCreateSingletonSettings = async () => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({
      storeName: 'Abu Bakar Medical Store',
      branchName: 'Main Branch',
      tagline: 'PHARMACY INVENTORY SYSTEM',
      currency: 'Rs',
      currencySymbol: 'Rs.',
      contactNumber: '+92 300 1234567',
      phone: '+92 300 1234567',
      email: 'info@abubakarmedical.pk',
      address: 'Main Bazar, Medical Market, Pakistan',
      licenseNumber: 'PB-LHR-2026-99042',
      lowStockThreshold: 10,
      expiryWarningDays: 90,
      nearExpiryDays: 90,
      updatedBy: 'System Default',
    });
  }
  return settings;
};

/**
 * Helper: Validate input settings fields
 */
const validateSettingsPayload = (body) => {
  const errors = [];

  if (body.storeName !== undefined && (!body.storeName || body.storeName.trim() === '')) {
    errors.push('Store name cannot be empty');
  }

  if (body.currency !== undefined && (!body.currency || body.currency.trim() === '')) {
    errors.push('Currency cannot be empty');
  }

  if (body.email !== undefined && body.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      errors.push('Invalid email format provided');
    }
  }

  if (body.lowStockThreshold !== undefined) {
    const threshold = Number(body.lowStockThreshold);
    if (isNaN(threshold) || threshold < 1) {
      errors.push('Low stock threshold must be a positive number of at least 1');
    }
  }

  if (body.expiryWarningDays !== undefined) {
    const days = Number(body.expiryWarningDays);
    if (isNaN(days) || days < 1) {
      errors.push('Expiry warning days must be a positive number of at least 1');
    }
  }

  if (body.nearExpiryDays !== undefined) {
    const days = Number(body.nearExpiryDays);
    if (isNaN(days) || days < 1) {
      errors.push('Near expiry days must be a positive number of at least 1');
    }
  }

  return errors;
};

/**
 * @desc    Get store settings
 * @route   GET /api/v1/settings
 * @access  Public / Private
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSingletonSettings();
  return ApiResponse.success(res, 'Store settings retrieved successfully', settings);
});

/**
 * @desc    Update complete store settings & thresholds
 * @route   PUT /api/v1/settings
 * @access  Private (Admin Only)
 */
const updateSettings = asyncHandler(async (req, res) => {
  const validationErrors = validateSettingsPayload(req.body);
  if (validationErrors.length > 0) {
    return ApiResponse.error(res, 'Validation failed for settings update', validationErrors, 400);
  }

  const settings = await getOrCreateSingletonSettings();

  const updatableFields = [
    'storeName',
    'branchName',
    'tagline',
    'currency',
    'currencySymbol',
    'contactNumber',
    'phone',
    'email',
    'address',
    'licenseNumber',
    'lowStockThreshold',
    'expiryWarningDays',
    'nearExpiryDays',
  ];

  updatableFields.forEach((key) => {
    if (req.body[key] !== undefined) {
      if (typeof req.body[key] === 'string') {
        settings[key] = req.body[key].trim();
      } else {
        settings[key] = req.body[key];
      }
    }
  });

  // Track updating administrator
  settings.updatedBy = req.user?.name || req.user?.username || 'Administrator';
  settings.updatedByEmployeeId = req.user?._id?.toString() || '';
  settings.updatedAt = new Date();

  await settings.save();

  return ApiResponse.success(res, 'Store settings updated successfully', settings);
});

/**
 * @desc    Update store profile & branch information
 * @route   PATCH /api/v1/settings/store
 * @access  Private (Admin Only)
 */
const updateStoreSettings = asyncHandler(async (req, res) => {
  const validationErrors = validateSettingsPayload(req.body);
  if (validationErrors.length > 0) {
    return ApiResponse.error(res, 'Validation failed for store settings update', validationErrors, 400);
  }

  const settings = await getOrCreateSingletonSettings();

  const storeFields = [
    'storeName',
    'branchName',
    'tagline',
    'currency',
    'currencySymbol',
    'contactNumber',
    'phone',
    'email',
    'address',
    'licenseNumber',
  ];

  let modified = false;
  storeFields.forEach((key) => {
    if (req.body[key] !== undefined) {
      settings[key] = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];
      modified = true;
    }
  });

  if (!modified) {
    return ApiResponse.error(res, 'No store fields provided for update', ['Empty payload'], 400);
  }

  settings.updatedBy = req.user?.name || req.user?.username || 'Administrator';
  settings.updatedByEmployeeId = req.user?._id?.toString() || '';
  settings.updatedAt = new Date();

  await settings.save();

  return ApiResponse.success(res, 'Store information updated successfully', settings);
});

/**
 * @desc    Update inventory thresholds (lowStockThreshold, expiryWarningDays)
 * @route   PATCH /api/v1/settings/inventory
 * @access  Private (Admin Only)
 */
const updateInventorySettings = asyncHandler(async (req, res) => {
  const validationErrors = validateSettingsPayload(req.body);
  if (validationErrors.length > 0) {
    return ApiResponse.error(res, 'Validation failed for inventory settings update', validationErrors, 400);
  }

  const settings = await getOrCreateSingletonSettings();

  const { lowStockThreshold, expiryWarningDays, nearExpiryDays } = req.body;

  if (lowStockThreshold === undefined && expiryWarningDays === undefined && nearExpiryDays === undefined) {
    return ApiResponse.error(
      res,
      'Provide at least one inventory parameter (lowStockThreshold or expiryWarningDays)',
      ['No inventory fields provided'],
      400
    );
  }

  if (lowStockThreshold !== undefined) {
    settings.lowStockThreshold = Number(lowStockThreshold);
  }

  if (expiryWarningDays !== undefined) {
    settings.expiryWarningDays = Number(expiryWarningDays);
    settings.nearExpiryDays = Number(expiryWarningDays);
  } else if (nearExpiryDays !== undefined) {
    settings.expiryWarningDays = Number(nearExpiryDays);
    settings.nearExpiryDays = Number(nearExpiryDays);
  }

  settings.updatedBy = req.user?.name || req.user?.username || 'Administrator';
  settings.updatedByEmployeeId = req.user?._id?.toString() || '';
  settings.updatedAt = new Date();

  await settings.save();

  return ApiResponse.success(res, 'Inventory thresholds updated successfully', settings);
});

/**
 * @desc    Reset all collections back to clean demo seed data
 * @route   POST /api/v1/settings/reset-demo-data
 * @access  Private (Admin Only)
 */
const resetDemoData = asyncHandler(async (req, res) => {
  // Clear collections
  await Promise.all([
    Employee.deleteMany(),
    Medicine.deleteMany(),
    Batch.deleteMany(),
    Sale.deleteMany(),
    StockHistory.deleteMany(),
    Setting.deleteMany(),
  ]);

  // Re-seed factory demo dataset
  await seedInitialData();

  const settings = await getOrCreateSingletonSettings();
  return ApiResponse.success(res, 'All demo data reset to seed state successfully', settings);
});

module.exports = {
  getSettings,
  updateSettings,
  updateStoreSettings,
  updateInventorySettings,
  resetDemoData,
};
