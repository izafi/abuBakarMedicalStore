const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const employeeRoutes = require('./employeeRoutes');
const permissionRoutes = require('./permissionRoutes');
const medicineRoutes = require('./medicineRoutes');
const batchRoutes = require('./batchRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const salesRoutes = require('./salesRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const reportRoutes = require('./reportRoutes');
const settingsRoutes = require('./settingsRoutes');

const router = express.Router();

// Mount all 11 required modules + health check
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/permissions', permissionRoutes);
router.use('/medicines', medicineRoutes);
router.use('/batches', batchRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', salesRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);

// Base /api/v1 index
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Abu Bakar Medical Store API v1 Operational',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      employees: '/api/v1/employees',
      permissions: '/api/v1/permissions',
      medicines: '/api/v1/medicines',
      batches: '/api/v1/batches',
      inventory: '/api/v1/inventory',
      sales: '/api/v1/sales',
      invoices: '/api/v1/invoices',
      dashboard: '/api/v1/dashboard',
      reports: '/api/v1/reports',
      settings: '/api/v1/settings',
    },
  });
});

module.exports = router;
