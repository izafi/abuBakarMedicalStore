const Employee = require('../models/Employee');
const Permission = require('../models/Permission');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all employees with their permission matrices
 * @route   GET /api/v1/employees
 * @access  Private (Admin Only)
 */
const getEmployees = asyncHandler(async (req, res) => {
  const employees = await Employee.find().sort({ createdAt: -1 });

  // Load permissions for each employee
  const employeeIds = employees.map((e) => e._id);
  const allPermissions = await Permission.find({ employeeId: { $in: employeeIds } });

  const enriched = employees.map((emp) => {
    const empPerms = allPermissions.filter((p) => p.employeeId.toString() === emp._id.toString());
    const permissionsMap = {};
    empPerms.forEach((p) => {
      permissionsMap[p.moduleName] = {
        view: p.canView,
        add: p.canAdd,
        edit: p.canEdit,
        delete: p.canDelete,
      };
    });

    const displayEmployeeId = emp.employeeId || `EMP-${String(emp._id).slice(-4).toUpperCase()}`;

    return {
      _id: emp._id,
      id: emp._id,
      employeeId: displayEmployeeId,
      name: emp.name,
      username: emp.username,
      email: emp.email,
      phone: emp.phone || '',
      role: emp.role,
      status: emp.status,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
      permissions: permissionsMap,
    };
  });

  return ApiResponse.success(res, 'Employees list retrieved successfully', enriched);
});

/**
 * @desc    Get single employee details with permissions
 * @route   GET /api/v1/employees/:id
 * @access  Private (Admin Only)
 */
const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return ApiResponse.error(res, 'Employee not found', ['No employee matches identifier'], 404);
  }

  const permissionsList = await Permission.find({ employeeId: employee._id });
  const permissionsMap = {};
  permissionsList.forEach((p) => {
    permissionsMap[p.moduleName] = {
      view: p.canView,
      add: p.canAdd,
      edit: p.canEdit,
      delete: p.canDelete,
    };
  });

  const displayEmployeeId = employee.employeeId || `EMP-${String(employee._id).slice(-4).toUpperCase()}`;

  return ApiResponse.success(res, 'Employee details retrieved', {
    _id: employee._id,
    id: employee._id,
    employeeId: displayEmployeeId,
    name: employee.name,
    username: employee.username,
    email: employee.email,
    phone: employee.phone || '',
    role: employee.role,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    permissions: permissionsMap,
  });
});

/**
 * @desc    Create new employee and initialize default permissions
 * @route   POST /api/v1/employees
 * @access  Private (Admin Only)
 */
const createEmployee = asyncHandler(async (req, res) => {
  const { name, username, email, password, role = 'Employee', status = 'Active', employeeId, phone, permissions } = req.body;

  if (!name || !username || !email || !password) {
    return ApiResponse.error(
      res,
      'Name, username, email, and password are required fields.',
      ['Missing required employee parameters'],
      400
    );
  }

  // Validate full name: letters and spaces only, no numbers allowed
  if (/\d/.test(name) || !/^[a-zA-Z\s]+$/.test(name.trim())) {
    return ApiResponse.error(res, 'Full name cannot contain numbers or special characters. Alphabetic characters only.', ['Invalid name format'], 400);
  }

  // Validate phone contact: must start with +92 and be exactly 13 characters
  if (phone) {
    const cleanPhone = String(phone).trim();
    if (!cleanPhone.startsWith('+92')) {
      return ApiResponse.error(res, 'Phone number must start with "+92" (e.g. +923001234567).', ['Invalid phone prefix'], 400);
    }
    if (cleanPhone.length !== 13) {
      return ApiResponse.error(res, `Phone number must be exactly 13 characters (received ${cleanPhone.length}).`, ['Invalid phone length'], 400);
    }
    if (!/^\+92\d{10}$/.test(cleanPhone)) {
      return ApiResponse.error(res, 'Phone number must be +92 followed by 10 digits.', ['Invalid phone digits'], 400);
    }
  }

  // Check unique username & email
  const existing = await Employee.findOne({
    $or: [
      { username: username.toLowerCase().trim() },
      { email: email.toLowerCase().trim() },
    ],
  });

  if (existing) {
    const field = existing.username === username.toLowerCase().trim() ? 'Username' : 'Email';
    return ApiResponse.error(res, `${field} is already in use.`, [`Duplicate ${field}`], 409);
  }

  const generatedId = employeeId?.trim() || `EMP-${String(Date.now()).slice(-3)}`;

  const employee = await Employee.create({
    employeeId: generatedId,
    name: name.trim(),
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || '',
    password,
    role,
    status,
  });

  // Save custom or default permissions
  if (permissions && typeof permissions === 'object' && Object.keys(permissions).length > 0) {
    const modules = ['medicines', 'inventory', 'sales', 'employees', 'reports'];
    for (const mod of modules) {
      const p = permissions[mod] || {};
      await Permission.findOneAndUpdate(
        { employeeId: employee._id, moduleName: mod },
        {
          $set: {
            canView: p.view !== undefined ? Boolean(p.view) : Boolean(p.canView),
            canAdd: p.add !== undefined ? Boolean(p.add) : Boolean(p.canAdd),
            canEdit: p.edit !== undefined ? Boolean(p.edit) : Boolean(p.canEdit),
            canDelete: p.delete !== undefined ? Boolean(p.delete) : Boolean(p.canDelete),
          },
        },
        { upsert: true, new: true }
      );
    }
  } else {
    // Seed default permission records
    await Permission.seedDefaultsForEmployee(employee._id, employee.role);
  }

  const permissionsList = await Permission.find({ employeeId: employee._id });
  const permissionsMap = {};
  permissionsList.forEach((p) => {
    permissionsMap[p.moduleName] = {
      view: p.canView,
      add: p.canAdd,
      edit: p.canEdit,
      delete: p.canDelete,
    };
  });

  const payload = {
    _id: employee._id,
    id: employee._id,
    employeeId: employee.employeeId,
    name: employee.name,
    username: employee.username,
    email: employee.email,
    phone: employee.phone || '',
    role: employee.role,
    status: employee.status,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
    permissions: permissionsMap,
  };

  return ApiResponse.created(res, `Employee '${employee.name}' created successfully`, payload);
});

/**
 * @desc    Update employee details
 * @route   PUT /api/v1/employees/:id
 * @access  Private (Admin Only)
 */
const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return ApiResponse.error(res, 'Employee not found', ['No employee matches identifier'], 404);
  }

  const { name, email, role, status, phone, employeeId, permissions } = req.body;

  // Rule 7: Prevent employees from changing their roles
  if (req.user.role !== 'Admin' && role && role !== employee.role) {
    return ApiResponse.error(
      res,
      'Access Denied: Standard employees are forbidden from changing roles.',
      ['Role modification forbidden'],
      403
    );
  }

  // Rule 8: Prevent demoting the last active Admin
  if (employee.role === 'Admin' && role === 'Employee') {
    const activeAdminCount = await Employee.countDocuments({ role: 'Admin', status: 'Active' });
    if (activeAdminCount <= 1) {
      return ApiResponse.error(
        res,
        'Operation Denied: Cannot demote the last active Administrator account.',
        ['System requires at least one active Administrator'],
        400
      );
    }
  }

  if (name) {
    if (/\d/.test(name) || !/^[a-zA-Z\s]+$/.test(name.trim())) {
      return ApiResponse.error(res, 'Full name cannot contain numbers or special characters. Alphabetic characters only.', ['Invalid name format'], 400);
    }
    employee.name = name.trim();
  }
  if (email) employee.email = email.toLowerCase().trim();
  if (role) employee.role = role;
  if (status) employee.status = status;
  if (phone !== undefined) {
    const cleanPhone = String(phone).trim();
    if (cleanPhone) {
      if (!cleanPhone.startsWith('+92')) {
        return ApiResponse.error(res, 'Phone number must start with "+92" (e.g. +923001234567).', ['Invalid phone prefix'], 400);
      }
      if (cleanPhone.length !== 13) {
        return ApiResponse.error(res, `Phone number must be exactly 13 characters (received ${cleanPhone.length}).`, ['Invalid phone length'], 400);
      }
      if (!/^\+92\d{10}$/.test(cleanPhone)) {
        return ApiResponse.error(res, 'Phone number must be +92 followed by 10 digits.', ['Invalid phone digits'], 400);
      }
    }
    employee.phone = cleanPhone;
  }
  if (employeeId !== undefined && employeeId.trim()) employee.employeeId = employeeId.trim();

  await employee.save();

  // Save updated permissions if provided in payload
  if (permissions && typeof permissions === 'object') {
    const modules = ['medicines', 'inventory', 'sales', 'employees', 'reports'];
    for (const mod of modules) {
      if (permissions[mod]) {
        const p = permissions[mod];
        await Permission.findOneAndUpdate(
          { employeeId: employee._id, moduleName: mod },
          {
            $set: {
              canView: p.view !== undefined ? Boolean(p.view) : (p.canView !== undefined ? Boolean(p.canView) : false),
              canAdd: p.add !== undefined ? Boolean(p.add) : (p.canAdd !== undefined ? Boolean(p.canAdd) : false),
              canEdit: p.edit !== undefined ? Boolean(p.edit) : (p.canEdit !== undefined ? Boolean(p.canEdit) : false),
              canDelete: p.delete !== undefined ? Boolean(p.delete) : (p.canDelete !== undefined ? Boolean(p.canDelete) : false),
            },
          },
          { upsert: true, new: true }
        );
      }
    }
  }

  // Retrieve current permissions for updated employee
  const allPermissions = await Permission.find({ employeeId: employee._id });
  const permissionsMap = {};
  allPermissions.forEach((p) => {
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

  const displayEmployeeId = employee.employeeId || `EMP-${String(employee._id).slice(-4).toUpperCase()}`;

  return ApiResponse.success(res, 'Employee updated successfully', {
    _id: employee._id,
    id: employee._id,
    employeeId: displayEmployeeId,
    name: employee.name,
    username: employee.username,
    email: employee.email,
    phone: employee.phone || '',
    role: employee.role,
    status: employee.status,
    updatedAt: employee.updatedAt,
    permissions: permissionsMap,
  });
});

/**
 * @desc    Delete employee
 * @route   DELETE /api/v1/employees/:id
 * @access  Private (Admin Only)
 */
const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return ApiResponse.error(res, 'Employee not found', ['No employee matches identifier'], 404);
  }

  // Prevent self-deletion
  if (req.user._id.toString() === employee._id.toString()) {
    return ApiResponse.error(
      res,
      'Operation Denied: You cannot delete your own active administrator account.',
      ['Self-deletion forbidden'],
      400
    );
  }

  // Rule 8: Prevent deletion of the last active Admin
  if (employee.role === 'Admin') {
    const activeAdminCount = await Employee.countDocuments({ role: 'Admin', status: 'Active' });
    if (activeAdminCount <= 1) {
      return ApiResponse.error(
        res,
        'Operation Denied: Cannot delete the last active Administrator account. System must maintain at least one Admin.',
        ['Last Admin deletion forbidden'],
        400
      );
    }
  }

  // Delete associated permissions and employee
  await Permission.deleteMany({ employeeId: employee._id });
  await employee.deleteOne();

  return ApiResponse.success(res, `Employee '${employee.name}' deleted successfully`, {});
});

/**
 * @desc    Toggle employee active/inactive status
 * @route   PATCH /api/v1/employees/:id/status
 * @access  Private (Admin Only)
 */
const toggleEmployeeStatus = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);

  if (!employee) {
    return ApiResponse.error(res, 'Employee not found', ['No employee matches identifier'], 404);
  }

  const newStatus = employee.status === 'Active' ? 'Inactive' : 'Active';

  // Rule 8: Prevent deactivating the last active Admin
  if (employee.role === 'Admin' && newStatus === 'Inactive') {
    const activeAdminCount = await Employee.countDocuments({ role: 'Admin', status: 'Active' });
    if (activeAdminCount <= 1) {
      return ApiResponse.error(
        res,
        'Operation Denied: Cannot deactivate the last active Administrator account.',
        ['System must maintain at least one active Admin'],
        400
      );
    }
  }

  employee.status = newStatus;
  await employee.save();

  return ApiResponse.success(res, `Employee status updated to '${newStatus}'`, {
    _id: employee._id,
    id: employee._id,
    name: employee.name,
    username: employee.username,
    status: employee.status,
  });
});

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
};
