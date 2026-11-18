/**
 * Centralized Global Error Handler Middleware
 * Adheres strictly to required Error Response structure:
 * {
 *   "success": false,
 *   "message": "Operation failed",
 *   "errors": []
 * }
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Operation failed';
  let errors = [];

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for resource identifier: ${err.value}`;
    errors = [{ field: err.path, message: `Invalid identifier: ${err.value}` }];
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    message = `Duplicate field value entered: ${field} '${value}' already exists.`;
    errors = [{ field, message: `${field} '${value}' is already registered.` }];
  }

  // 3. Mongoose Schema Validation Error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed. Please verify input fields.';
    errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // 4. JWT Authentication Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Authorization denied.';
    errors = ['Token is malformed or invalid'];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please log in again.';
    errors = ['Token has expired'];
  } else if (err.errors && Array.isArray(err.errors)) {
    errors = err.errors;
  } else if (err.message && statusCode >= 400 && statusCode < 500) {
    errors = [err.message];
  }

  // Log in server output
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message} (${req.method} ${req.originalUrl})`);
    if (statusCode === 500 && err.stack) {
      console.error(err.stack);
    }
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

module.exports = errorHandler;
