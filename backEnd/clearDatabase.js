/**
 * Database Reset Script - Abu Bakar Medical Store
 * Clears ALL dummy medicines, batches, sales, invoices, and stock history.
 * Retains only the default Administrator account and basic store profile.
 */
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();
dotenv.config({ path: path.join(__dirname, '.env') });

const Employee = require('./models/Employee');
const Medicine = require('./models/Medicine');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const SaleItem = require('./models/SaleItem');
const Invoice = require('./models/Invoice');
const StockHistory = require('./models/StockHistory');
const Setting = require('./models/Setting');
const Settings = require('./models/Settings');
const Permission = require('./models/Permission');

const clearAllData = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Error] No MongoDB connection URI found in .env');
    process.exit(1);
  }

  try {
    console.log('[Clear] Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('[Clear] Connected successfully.');

    // 1. Delete all business collections
    console.log('[Clear] Purging medicines, batches, sales, and stock history...');
    await Promise.all([
      Medicine.deleteMany({}),
      Batch.deleteMany({}),
      Sale.deleteMany({}),
      SaleItem.deleteMany({}),
      Invoice.deleteMany({}),
      StockHistory.deleteMany({}),
    ]);
    console.log('[Clear] All medicines, batches, sales, and stock logs deleted.');

    // 2. Ensure only Admin employee exists
    console.log('[Clear] Cleaning employees list...');
    await Employee.deleteMany({ role: { $ne: 'Admin' } });

    let admin = await Employee.findOne({ role: 'Admin' });
    if (!admin) {
      console.log('[Clear] Creating clean default Admin...');
      admin = await Employee.create({
        employeeId: 'EMP-001',
        name: 'Huzaifa Zafi',
        username: 'huzaifazafi',
        email: 'huzaifazafi156@gmail.com',
        password: 'admin1234',
        role: 'Admin',
        status: 'Active',
      });
    } else {
      admin.employeeId = 'EMP-001';
      admin.name = 'Huzaifa Zafi';
      admin.username = 'huzaifazafi';
      admin.email = 'huzaifazafi156@gmail.com';
      admin.password = 'admin1234';
      admin.status = 'Active';
      await admin.save();
    }

    // Reset permissions for Admin
    await Permission.deleteMany({});
    await Permission.seedDefaultsForEmployee(admin._id, 'Admin');
    console.log('[Clear] Admin permissions initialized.');

    // 3. Reset store settings to pristine defaults
    console.log('[Clear] Resetting store settings...');
    await Promise.all([Setting.deleteMany({}), Settings.deleteMany({})]);

    await Setting.create({
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
      lowStockThreshold: 10,
      expiryWarningDays: 90,
      nearExpiryDays: 90,
      updatedBy: 'System Default',
    });

    console.log('[SUCCESS] Database is 100% clean and ready for client delivery!');
    process.exit(0);
  } catch (err) {
    console.error('[Error] Failed to clear database:', err.message);
    process.exit(1);
  }
};

clearAllData();
