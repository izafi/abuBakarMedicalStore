/**
 * Standardized JSON API Response utility
 * Conforms strictly to required Success and Error specifications
 */
class ApiResponse {
  static success(res, message = 'Operation successful', data = {}, statusCode = 200, meta = null) {
    const payload = {
      success: true,
      message,
      data: data !== null && data !== undefined ? data : {},
    };
    if (meta) {
      payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, message = 'Resource created successfully', data = {}) {
    return this.success(res, message, data, 201);
  }

  static error(res, message = 'Operation failed', errors = [], statusCode = 500) {
    let formattedErrors = [];
    if (Array.isArray(errors)) {
      formattedErrors = errors;
    } else if (typeof errors === 'string') {
      formattedErrors = [errors];
    } else if (errors && typeof errors === 'object') {
      formattedErrors = [errors];
    }

    const payload = {
      success: false,
      message,
      errors: formattedErrors,
    };
    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
