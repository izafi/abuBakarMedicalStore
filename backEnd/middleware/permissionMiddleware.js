const ApiResponse = require('../utils/apiResponse');

/**
 * Check module-level permission (view, add, edit, delete)
 * Rule: Admin role bypasses all checks and has full access.
 */
const checkPermission = (moduleName, action = 'view') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required before checking permissions.', [], 401);
    }

    // Admin has unrestricted access
    if (req.user.role === 'Admin') {
      return next();
    }

    const userPermissions = req.user.permissions || {};
    const modulePerms = userPermissions[moduleName];

    if (!modulePerms || !modulePerms[action]) {
      return ApiResponse.error(
        res,
        `Access Denied: You lack '${action}' authorization on the '${moduleName}' module.`,
        [`Required permission: ${moduleName}.${action}`],
        403
      );
    }

    next();
  };
};

/**
 * Restrict endpoint to Admin role only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return ApiResponse.error(res, 'Authentication required.', [], 401);
  }

  if (req.user.role !== 'Admin') {
    return ApiResponse.error(
      res,
      'Access Denied: Administrator role privileges required.',
      ['Forbidden operation for standard employees.'],
      403
    );
  }

  next();
};

module.exports = {
  checkPermission,
  requireAdmin,
};
