const { body, validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

const MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Liquid',
  'Injection',
  'Cream',
  'Drops',
  'Inhaler',
  'Ointment',
  'Gel',
  'Other',
];

/**
 * Middleware that handles express-validator result and returns uniform error structure
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return ApiResponse.error(res, 'Validation failed. Please verify input fields.', errorDetails, 400);
  }
  next();
};

/**
 * Validation rules for registration / employee creation
 */
const validateRegister = [
  body('name').trim().notEmpty().withMessage('Employee full name is required'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('Username may only contain letters, numbers, dots, and hyphens'),
  body('email').trim().isEmail().withMessage('Valid email address is required'),
  body('password')
    .isLength({ min: 4 })
    .withMessage('Password must be at least 4 characters long'),
  body('role')
    .optional()
    .isIn(['Admin', 'Employee'])
    .withMessage("Role must be either 'Admin' or 'Employee'"),
  handleValidationErrors,
];

/**
 * Validation rules for login
 */
const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

/**
 * Validation rules for password verification (checkout counter authorization)
 */
const validateVerifyPassword = [
  body('password').notEmpty().withMessage('Employee password is required for checkout verification'),
  handleValidationErrors,
];

/**
 * Validation rules for password change
 */
const validateChangePassword = [
  body('newPassword')
    .isLength({ min: 4 })
    .withMessage('New password must be at least 4 characters long'),
  handleValidationErrors,
];

/**
 * Validation rules for creating a medicine
 */
const validateCreateMedicine = [
  body('name').trim().notEmpty().withMessage('Medicine name is required'),
  body('genericName').trim().notEmpty().withMessage('Generic name is required'),
  body('strength').trim().notEmpty().withMessage('Strength is required (e.g. 500mg, 10ml)'),
  body('type')
    .optional()
    .isIn(MEDICINE_TYPES)
    .withMessage(`Type must be one of: ${MEDICINE_TYPES.join(', ')}`),
  body('category').optional().trim(),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price cannot be negative'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price cannot be negative'),
  handleValidationErrors,
];

/**
 * Validation rules for updating a medicine
 */
const validateUpdateMedicine = [
  body('name').optional().trim().notEmpty().withMessage('Medicine name cannot be empty'),
  body('genericName').optional().trim().notEmpty().withMessage('Generic name cannot be empty'),
  body('type')
    .optional()
    .isIn(MEDICINE_TYPES)
    .withMessage(`Type must be one of: ${MEDICINE_TYPES.join(', ')}`),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price cannot be negative'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price cannot be negative'),
  handleValidationErrors,
];

/**
 * Validation rules for creating a batch
 */
const validateCreateBatch = [
  body('medicineId').trim().notEmpty().withMessage('Parent medicineId is required'),
  body('batchNumber').trim().notEmpty().withMessage('Batch number is required'),
  body('manufacturingDate').notEmpty().withMessage('Manufacturing date is required'),
  body('expiryDate').notEmpty().withMessage('Expiry date is required'),
  body('purchasePrice')
    .notEmpty()
    .withMessage('Purchase price is required')
    .isFloat({ min: 0 })
    .withMessage('Purchase price cannot be negative'),
  body('sellingPrice')
    .notEmpty()
    .withMessage('Selling price is required')
    .isFloat({ min: 0 })
    .withMessage('Selling price cannot be negative'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0 })
    .withMessage('Quantity cannot be negative'),
  handleValidationErrors,
];

/**
 * Validation rules for updating a batch
 */
const validateUpdateBatch = [
  body('batchNumber').optional().trim().notEmpty().withMessage('Batch number cannot be empty'),
  body('purchasePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase price cannot be negative'),
  body('sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price cannot be negative'),
  body('quantity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Quantity cannot be negative'),
  handleValidationErrors,
];

/**
 * Validation rules for Secure Checkout Verification
 */
const validateCheckoutSale = [
  body('employeePassword')
    .optional()
    .trim(),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateVerifyPassword,
  validateChangePassword,
  validateCreateMedicine,
  validateUpdateMedicine,
  validateCreateBatch,
  validateUpdateBatch,
  validateCheckoutSale,
  handleValidationErrors,
};
