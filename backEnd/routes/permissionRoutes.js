const express = require('express');
const {
  getPermissionSchema,
  getEmployeePermissions,
  updateEmployeePermissions,
} = require('../controller/permissionController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getPermissionSchema);
router.get('/:employeeId', getEmployeePermissions);
router.put('/:employeeId', requireAdmin, updateEmployeePermissions);

module.exports = router;
