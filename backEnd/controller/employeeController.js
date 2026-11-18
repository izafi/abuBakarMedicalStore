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

    return {
      _id: emp._id,
      id: emp._id,
      name: emp.name,
      username: emp.username,
      email: emp.email,
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

  return ApiResponse.success(res, 'Employee details retrieved', {
    _id: employee._id,
    id: employee._id,
    name: employee.name,
    username: employee.username,
    email: employee.email,
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
  const { name, username, email, password, role = 'Employee', status = 'Active' } = req.body;

  if (!name || !username || !email || !password) {
    return ApiResponse.error(
      res,
      'Name, username, email, and password are required fields.',
      ['Missing required employee parameters'],
      400
    );
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

  const employee = await Employee.create({
    name: name.trim(),
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password,
    role,
    status,
  });

  // Seed default permission records
  await Permission.seedDefaultsForEmployee(employee._id, employee.role);

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
    name: employee.name,
    username: employee.username,
    email: employee.email,
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

  const { name, email, role, status } = req.body;

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

  if (name) employee.name = name.trim();
  if (email) employee.email = email.toLowerCase().trim();
  if (role) employee.role = role;
  if (status) employee.status = status;

  await employee.save();

  return ApiResponse.success(res, 'Employee updated successfully', {
    _id: employee._id,
    id: employee._id,
    name: employee.name,
    username: employee.username,
    email: employee.email,
    role: employee.role,
    status: employee.status,
    updatedAt: employee.updatedAt,
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
