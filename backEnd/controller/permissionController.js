const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Permission = require('../models/Permission');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const PERMISSION_MODULES = ['medicines', 'inventory', 'sales', 'employees', 'reports'];
const PERMISSION_ACTIONS = ['view', 'add', 'edit', 'delete'];

/**
 * @desc    Get system permission modules schema & defaults
 * @route   GET /api/v1/permissions
 * @access  Private
 */
const getPermissionSchema = asyncHandler(async (req, res) => {
  const schema = {
    modules: PERMISSION_MODULES,
    actions: PERMISSION_ACTIONS,
    defaultAdmin: {
      medicines: { view: true, add: true, edit: true, delete: true },
      inventory: { view: true, add: true, edit: true, delete: true },
      sales: { view: true, add: true, edit: true, delete: true },
      employees: { view: true, add: true, edit: true, delete: true },
      reports: { view: true, add: true, edit: true, delete: true },
    },
    defaultEmployee: {
      medicines: { view: true, add: true, edit: true, delete: false },
      inventory: { view: true, add: true, edit: false, delete: false },
      sales: { view: true, add: true, edit: true, delete: false },
      employees: { view: false, add: false, edit: false, delete: false },
      reports: { view: true, add: false, edit: false, delete: false },
    },
  };

  return ApiResponse.success(res, 'Permission schema retrieved', schema);
});

/**
 * @desc    Get permissions for a specific employee
 * @route   GET /api/v1/permissions/:employeeId
 * @access  Private
 */
const getEmployeePermissions = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return ApiResponse.error(res, 'Invalid employee identifier format', ['Invalid employeeId'], 400);
  }

  const employee = await Employee.findById(employeeId).select('name username email role status');
  if (!employee) {
    return ApiResponse.error(res, 'Employee not found', ['No employee matches identifier'], 404);
  }

  // Non-admin can only view their own permissions unless they have permission
  if (req.user.role !== 'Admin' && req.user._id.toString() !== employee._id.toString()) {
    return ApiResponse.error(
      res,
      'Access Denied: You can only view your own permissions.',
      ['Forbidden: Cannot view other employee permissions'],
      403
    );
  }

  let permissionsList = await Permission.find({ employeeId: employee._id });

  // If no permissions records exist, seed defaults
  if (permissionsList.length === 0) {
    await Permission.seedDefaultsForEmployee(employee._id, employee.role);
    permissionsList = await Permission.find({ employeeId: employee._id });
  }

  const permissionsMap = {};
  permissionsList.forEach((p) => {
    permissionsMap[p.moduleName] = {
      view: p.canView,
      add: p.canAdd,
      edit: p.canEdit,
      delete: p.canDelete,
      canView: p.canView,
      canAdd: p.canAdd,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
    };
  });

  return ApiResponse.success(res, `Permissions for ${employee.name}`, {
    employeeId: employee._id,
    name: employee.name,
    username: employee.username,
    role: employee.role,
    status: employee.status,
    permissions: permissionsMap,
  });
});

/**
 * @desc    Update permissions for a specific employee
 * @route   PUT /api/v1/permissions/:employeeId
 * @access  Private (requireAdmin)
 */
const updateEmployeePermissions = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    return ApiResponse.error(res, 'Invalid employee identifier format', ['Invalid employeeId'], 400);
  }

  const employee = await Employee.findById(employeeId).select('name username email role status');
  if (!employee) {
    return ApiResponse.error(res, 'Employee not found', ['No employee matches identifier'], 404);
  }

  // Raw permissions map or array
  const incomingPermissions = req.body.permissions || req.body;

  if (!incomingPermissions || typeof incomingPermissions !== 'object') {
    return ApiResponse.error(
      res,
      'Permissions payload must be an object of modules or an array of permissions.',
      ['Invalid permissions payload'],
      400
    );
  }

  // If incomingPermissions is an array of objects [{ moduleName, canView, ... }]
  if (Array.isArray(incomingPermissions)) {
    for (const item of incomingPermissions) {
      if (item.moduleName && PERMISSION_MODULES.includes(item.moduleName)) {
        await Permission.findOneAndUpdate(
          { employeeId: employee._id, moduleName: item.moduleName },
          {
            $set: {
              canView: item.canView !== undefined ? Boolean(item.canView) : Boolean(item.view),
              canAdd: item.canAdd !== undefined ? Boolean(item.canAdd) : Boolean(item.add),
              canEdit: item.canEdit !== undefined ? Boolean(item.canEdit) : Boolean(item.edit),
              canDelete: item.canDelete !== undefined ? Boolean(item.canDelete) : Boolean(item.delete),
            },
          },
          { upsert: true, new: true }
        );
      }
    }
  } else {
    // Dictionary format: { medicines: { view: true, add: true, edit: true, delete: false }, ... }
    for (const [moduleName, perms] of Object.entries(incomingPermissions)) {
      if (PERMISSION_MODULES.includes(moduleName) && typeof perms === 'object' && perms !== null) {
        await Permission.findOneAndUpdate(
          { employeeId: employee._id, moduleName },
          {
            $set: {
              canView: perms.canView !== undefined ? Boolean(perms.canView) : Boolean(perms.view),
              canAdd: perms.canAdd !== undefined ? Boolean(perms.canAdd) : Boolean(perms.add),
              canEdit: perms.canEdit !== undefined ? Boolean(perms.canEdit) : Boolean(perms.edit),
              canDelete: perms.canDelete !== undefined ? Boolean(perms.canDelete) : Boolean(perms.delete),
            },
          },
          { upsert: true, new: true }
        );
      }
    }
  }

  // Fetch updated list
  const updatedList = await Permission.find({ employeeId: employee._id });
  const permissionsMap = {};
  updatedList.forEach((p) => {
    permissionsMap[p.moduleName] = {
      view: p.canView,
      add: p.canAdd,
      edit: p.canEdit,
      delete: p.canDelete,
      canView: p.canView,
      canAdd: p.canAdd,
      canEdit: p.canEdit,
      canDelete: p.canDelete,
    };
  });

  return ApiResponse.success(res, `Permissions updated for ${employee.name}`, {
    employeeId: employee._id,
    name: employee.name,
    username: employee.username,
    role: employee.role,
    permissions: permissionsMap,
  });
});

module.exports = {
  getPermissionSchema,
  getEmployeePermissions,
  updateEmployeePermissions,
};
