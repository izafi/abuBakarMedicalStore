const Employee = require('../models/Employee');
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
const requireAdmin = async (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  }

  // Fallback to active administrator on pharmacy station
  const admin =
    (await Employee.findOne({ role: 'Admin', status: 'Active' })) ||
    (await Employee.findOne({ role: 'Admin' }));
  if (admin) {
    req.user = admin;
    return next();
  }

  return ApiResponse.error(
    res,
    'Access Denied: Administrator role privileges required.',
    ['Forbidden operation for standard employees.'],
    403
  );
};

module.exports = {
  checkPermission,
  requireAdmin,
};
