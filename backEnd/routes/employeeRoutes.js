const express = require('express');
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
} = require('../controller/employeeController');
const { authenticate } = require('../middleware/authMiddleware');
const { checkPermission, requireAdmin } = require('../middleware/permissionMiddleware');

const router = express.Router();

// All employee routes require authentication
router.use(authenticate);

// View employees (requires 'employees.view' permission or Admin)
router.get('/', checkPermission('employees', 'view'), getEmployees);
router.get('/:id', checkPermission('employees', 'view'), getEmployeeById);

// Employee Management (Admin Only)
router.post('/', requireAdmin, createEmployee);
router.put('/:id', requireAdmin, updateEmployee);
router.delete('/:id', requireAdmin, deleteEmployee);
router.patch('/:id/status', requireAdmin, toggleEmployeeStatus);

module.exports = router;
