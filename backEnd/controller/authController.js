const Employee = require('../models/Employee');
const Permission = require('../models/Permission');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Helper: Issue JWT Token and Set HTTP-only Cookie
 */
const sendAuthResponse = async (employee, statusCode, res, message = 'Authentication successful') => {
  const token = employee.generateAuthToken();

  // Set HTTP-only cookie
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  };

  // Fetch full permission matrix for this employee
  let permissionsList = await Permission.find({ employeeId: employee._id });
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
    };
  });

  const userProfile = {
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

  return res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      data: {
        token,
        user: userProfile,
      },
    });
};

/**
 * @desc    Register a new employee
 * @route   POST /api/v1/auth/register
 * @access  Private (Admin Only, or bootstrap if 0 employees exist)
 */
const register = asyncHandler(async (req, res) => {
  const { name, username, email, password, role = 'Employee' } = req.body;

  // Check if any employees exist; if not, allow first account to register as Admin
  const totalEmployees = await Employee.countDocuments();
  if (totalEmployees > 0) {
    if (!req.user || req.user.role !== 'Admin') {
      return ApiResponse.error(
        res,
        'Access Denied: Only an active Administrator can register new employee accounts.',
        ['Forbidden: Admin role required'],
        403
      );
    }
  }

  // Check unique username and email
  const existingUser = await Employee.findOne({
    $or: [
      { username: username.toLowerCase().trim() },
      { email: email.toLowerCase().trim() },
    ],
  });

  if (existingUser) {
    const duplicateField = existingUser.username === username.toLowerCase().trim() ? 'Username' : 'Email';
    return ApiResponse.error(
      res,
      `${duplicateField} is already registered.`,
      [`${duplicateField} '${duplicateField === 'Username' ? username : email}' already in use`],
      409
    );
  }

  const employee = await Employee.create({
    name: name.trim(),
    username: username.toLowerCase().trim(),
    email: email.toLowerCase().trim(),
    password,
    role: totalEmployees === 0 ? 'Admin' : role,
    status: 'Active',
  });

  // Seed default permission records in Permission collection
  await Permission.seedDefaultsForEmployee(employee._id, employee.role);

  return sendAuthResponse(employee, 201, res, `Employee account '${employee.name}' registered successfully`);
});

/**
 * @desc    Employee Login (Cookie & Bearer Token)
 * @route   POST /api/v1/auth/login
 * @access  Public (Rate Limited)
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Case-insensitive lookup by username OR email; explicitly fetch password hash
  const employee = await Employee.findOne({
    $or: [
      { username: username.toLowerCase().trim() },
      { email: username.toLowerCase().trim() },
    ],
  }).select('+password');

  if (!employee) {
    return ApiResponse.error(
      res,
      'Invalid credentials: Username or password incorrect.',
      ['Invalid username or password'],
      401
    );
  }

  // Check account status
  if (employee.status !== 'Active') {
    return ApiResponse.error(
      res,
      'Account suspended: Your employee profile has been deactivated. Please contact your pharmacy administrator.',
      ['Employee status is Inactive'],
      403
    );
  }

  // Compare entered password with bcrypt hash
  const isMatch = await employee.matchPassword(password);
  if (!isMatch) {
    return ApiResponse.error(
      res,
      'Invalid credentials: Username or password incorrect.',
      ['Invalid username or password'],
      401
    );
  }

  return sendAuthResponse(employee, 200, res, `Welcome back, ${employee.name}`);
});

/**
 * @desc    Employee Logout (Clears HTTP-only Cookie)
 * @route   POST /api/v1/auth/logout
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return ApiResponse.success(res, 'Logged out successfully', {});
});

/**
 * @desc    Get Current Logged-in Employee Profile & Permissions
 * @route   GET /api/v1/auth/me
 * @access  Private (Authenticated)
 */
const getMe = asyncHandler(async (req, res) => {
  const employee = req.user;

  // Retrieve permissions from Permission collection
  let permissionsList = await Permission.find({ employeeId: employee._id });
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
    };
  });

  const userProfile = {
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

  return ApiResponse.success(res, 'Profile retrieved successfully', userProfile);
});

/**
 * @desc    Verify the Logged-in Employee's Own Password for Counter Checkout
 * @route   POST /api/v1/auth/verify-password
 * @access  Private (Authenticated)
 * @note    CRITICAL: Never trusts employeeId sent by frontend. Always validates req.user._id.
 */
const verifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return ApiResponse.error(
      res,
      'Password is required to verify checkout authorization.',
      ['Password field is empty'],
      400
    );
  }

  // Strictly use authenticated session ID from JWT
  const employee = await Employee.findById(req.user._id).select('+password');
  if (!employee) {
    return ApiResponse.error(res, 'Authenticated employee session not found.', ['User not found'], 401);
  }

  if (employee.status !== 'Active') {
    return ApiResponse.error(
      res,
      'Employee account is inactive. Inactive employees cannot authorize checkout.',
      ['Account is inactive'],
      403
    );
  }

  const isMatch = await employee.matchPassword(password);
  if (!isMatch) {
    return ApiResponse.error(
      res,
      'Employee Verification Failed: Incorrect password entered. Sale aborted and stock has NOT been deducted.',
      ['Incorrect password'],
      401
    );
  }

  return ApiResponse.success(res, 'Employee authorization verified successfully', {
    verified: true,
    employeeId: employee._id,
    name: employee.name,
    username: employee.username,
    role: employee.role,
  });
});

/**
 * @desc    Change Demo / Employee Password
 * @route   POST /api/v1/auth/change-password
 * @access  Private (Authenticated)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { newPassword, currentPassword } = req.body;

  if (!newPassword || newPassword.length < 4) {
    return ApiResponse.error(res, 'New password must be at least 4 characters long.', ['Password too short'], 400);
  }

  const employee = await Employee.findById(req.user._id).select('+password');

  // If currentPassword is provided, verify it first
  if (currentPassword) {
    const isCurrentMatch = await employee.matchPassword(currentPassword);
    if (!isCurrentMatch) {
      return ApiResponse.error(res, 'Current password incorrect.', ['Invalid current password'], 400);
    }
  }

  employee.password = newPassword;
  await employee.save();

  return ApiResponse.success(res, 'Password updated successfully', {});
});

/**
 * @desc    Get Demo Accounts list for account switcher
 * @route   GET /api/v1/auth/demo-accounts
 * @access  Public
 */
const getDemoAccounts = asyncHandler(async (req, res) => {
  const employees = await Employee.find({ status: 'Active' })
    .select('name username email role status createdAt')
    .sort({ role: 1 });

  return ApiResponse.success(res, 'Demo accounts retrieved', employees);
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  verifyPassword,
  changePassword,
  getDemoAccounts,
};
