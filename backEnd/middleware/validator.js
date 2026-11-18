const { body, validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

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

module.exports = {
  validateRegister,
  validateLogin,
  validateVerifyPassword,
  validateChangePassword,
  handleValidationErrors,
};
