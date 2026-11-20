const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Permission = require('../models/Permission');
const Settings = require('../models/Settings');

/**
 * Clean Database Initialization
 * Seeds only default administrator credentials and store settings.
 * Does NOT seed dummy medicines or mock batches.
 */
const seedInitialData = async () => {
  try {
    const employeeCount = await Employee.countDocuments();
    if (employeeCount === 0) {
      console.log('[Seeder] Initializing default administrator account...');

      // Default Admin Employee
      const admin = await Employee.create({
        employeeId: 'EMP-001',
        name: 'Huzaifa Zafi',
        username: 'huzaifazafi',
        email: 'huzaifazafi156@gmail.com',
        password: 'admin1234',
        role: 'Admin',
        status: 'Active',
      });
      await Permission.seedDefaultsForEmployee(admin._id, 'Admin');

      console.log('[Seeder] Default administrator and permissions initialized.');
    } else {
      // Ensure all existing employees have permissions initialized
      const existingEmployees = await Employee.find();
      for (const emp of existingEmployees) {
        const count = await Permission.countDocuments({ employeeId: emp._id });
        if (count === 0) {
          await Permission.seedDefaultsForEmployee(emp._id, emp.role);
        }
      }
    }

    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      console.log('[Seeder] Initializing default store settings...');
      await Settings.create({
        storeName: 'Abu Bakar Medical Store',
        branchName: 'Main Branch',
        tagline: 'PHARMACY INVENTORY SYSTEM',
        currency: 'Rs',
        currencySymbol: 'Rs.',
        contactNumber: '+92 300 1234567',
        phone: '+92 300 1234567',
        email: 'info@abubakarmedical.pk',
        address: 'Main Bazar, Medical Market, Pakistan',
        licenseNumber: 'PB-LHR-2026-99042',
        lowStockThreshold: 15,
        expiryWarningDays: 60,
        nearExpiryDays: 60,
        updatedBy: 'System Default',
      });
      console.log('[Seeder] Default store settings initialized.');
    }
  } catch (err) {
    console.error('[Seeder] Error in seedInitialData:', err.message);
  }
};

module.exports = seedInitialData;
