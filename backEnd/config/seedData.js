const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Permission = require('../models/Permission');
const Medicine = require('../models/Medicine');
const Batch = require('../models/Batch');
const Settings = require('../models/Settings');

const seedInitialData = async () => {
  try {
    const employeeCount = await Employee.countDocuments();
    if (employeeCount === 0) {
      console.log('[Seeder] Initializing default demo employees...');

      // 1. Ayesha Khan (Admin)
      const ayesha = await Employee.create({
        name: 'Ayesha Khan',
        username: 'ayesha.admin',
        email: 'ayesha.khan@abmstore.pk',
        password: 'ayesha123',
        role: 'Admin',
        status: 'Active',
      });
      await Permission.seedDefaultsForEmployee(ayesha._id, 'Admin');

      // 2. Bilal Ahmed (Employee)
      const bilal = await Employee.create({
        name: 'Bilal Ahmed',
        username: 'bilal.pharma',
        email: 'bilal.ahmed@abmstore.pk',
        password: 'bilal123',
        role: 'Employee',
        status: 'Active',
      });
      await Permission.seedDefaultsForEmployee(bilal._id, 'Employee');

      // 3. Sana Malik (Employee)
      const sana = await Employee.create({
        name: 'Sana Malik',
        username: 'sana.cashier',
        email: 'sana.malik@abmstore.pk',
        password: 'sana123',
        role: 'Employee',
        status: 'Active',
      });
      await Permission.seedDefaultsForEmployee(sana._id, 'Employee');

      console.log('[Seeder] 3 Demo Employees and Permission matrices seeded.');
    } else {
      // Ensure all existing employees have permissions initialized in Permission collection
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
        lowStockThreshold: 10,
        expiryWarningDays: 90,
        nearExpiryDays: 90,
        updatedBy: 'System Default',
      });
      console.log('[Seeder] Store Settings seeded.');
    }

    const medCount = await Medicine.countDocuments();
    if (medCount === 0) {
      console.log('[Seeder] Seeding initial medicines catalog & batches...');
      const createdMeds = await Medicine.create([
        {
          medicineId: 'MED-1001',
          name: 'Panadol 500mg',
          genericName: 'Paracetamol',
          brand: 'GSK',
          formula: 'C8H9NO2',
          strength: '500mg',
          type: 'Tablet',
          category: 'Analgesics / Antipyretics',
          usage: 'Fever and mild to moderate pain relief',
          manufacturer: 'GlaxoSmithKline Pakistan',
          sellingPrice: 35.0,
          purchasePrice: 28.0,
          rack: 'Rack A-1',
          shelf: 'Shelf 2',
          minStockAlert: 30,
          isActive: true,
        },
        {
          medicineId: 'MED-1002',
          name: 'Augmentin 625mg',
          genericName: 'Amoxicillin + Clavulanic Acid',
          brand: 'GSK',
          formula: 'Amoxicillin Trihydrate',
          strength: '625mg',
          type: 'Tablet',
          category: 'Antibiotics',
          usage: 'Bacterial infections of ear, lungs, urinary tract',
          manufacturer: 'GlaxoSmithKline Pakistan',
          sellingPrice: 280.0,
          purchasePrice: 235.0,
          rack: 'Rack B-1',
          shelf: 'Shelf 1',
          minStockAlert: 15,
          isActive: true,
        },
        {
          medicineId: 'MED-1003',
          name: 'Brufen 400mg',
          genericName: 'Ibuprofen',
          brand: 'Abbott',
          formula: 'C13H18O2',
          strength: '400mg',
          type: 'Tablet',
          category: 'NSAIDs',
          usage: 'Inflammation, dental pain, arthritis',
          manufacturer: 'Abbott Laboratories Pakistan',
          sellingPrice: 65.0,
          purchasePrice: 52.0,
          rack: 'Rack A-2',
          shelf: 'Shelf 3',
          minStockAlert: 25,
          isActive: true,
        },
        {
          medicineId: 'MED-1004',
          name: 'Risek 20mg',
          genericName: 'Omeprazole',
          brand: 'Getz Pharma',
          formula: 'C17H19N3O3S',
          strength: '20mg',
          type: 'Capsule',
          category: 'Gastrointestinal',
          usage: 'Acid reflux, peptic ulcers, heartburn',
          manufacturer: 'Getz Pharma Pakistan',
          sellingPrice: 190.0,
          purchasePrice: 155.0,
          rack: 'Rack C-1',
          shelf: 'Shelf 2',
          minStockAlert: 20,
          isActive: true,
        },
        {
          medicineId: 'MED-1005',
          name: 'Cac-1000 Plus',
          genericName: 'Calcium + Vitamin C + D3 + B6',
          brand: 'GSK',
          formula: 'Effervescent Multivitamin',
          strength: '1000mg',
          type: 'Tablet',
          category: 'Vitamins & Supplements',
          usage: 'Bone health and immunity supplement',
          manufacturer: 'GlaxoSmithKline Pakistan',
          sellingPrice: 320.0,
          purchasePrice: 270.0,
          rack: 'Rack D-1',
          shelf: 'Shelf 4',
          minStockAlert: 15,
          isActive: true,
        },
      ]);

      const medMap = {};
      createdMeds.forEach((m) => {
        medMap[m.medicineId] = m._id;
      });

      await Batch.create([
        {
          batchId: 'BAT-1001',
          medicineId: medMap['MED-1001'],
          medicineCode: 'MED-1001',
          batchNumber: 'PAN-2026-981',
          manufacturingDate: new Date('2025-01-15'),
          expiryDate: new Date('2028-06-30'),
          purchasePrice: 28.0,
          sellingPrice: 35.0,
          quantity: 140,
          rack: 'Rack A-1',
          shelf: 'Shelf 2',
          location: 'Rack A-1, Shelf 2',
          status: 'In Stock',
          supplier: 'GSK Distribution Lahore',
        },
        {
          batchId: 'BAT-1002',
          medicineId: medMap['MED-1001'],
          medicineCode: 'MED-1001',
          batchNumber: 'PAN-2025-412',
          manufacturingDate: new Date('2024-06-10'),
          expiryDate: new Date('2026-12-15'),
          purchasePrice: 26.5,
          sellingPrice: 35.0,
          quantity: 18,
          rack: 'Rack A-1',
          shelf: 'Shelf 3',
          location: 'Rack A-1, Shelf 3',
          status: 'Near Expiry',
          supplier: 'GSK Distribution Lahore',
        },
        {
          batchId: 'BAT-1003',
          medicineId: medMap['MED-1002'],
          medicineCode: 'MED-1002',
          batchNumber: 'AUG-2025-774',
          manufacturingDate: new Date('2025-02-01'),
          expiryDate: new Date('2027-04-30'),
          purchasePrice: 235.0,
          sellingPrice: 280.0,
          quantity: 45,
          rack: 'Rack B-1',
          shelf: 'Shelf 1',
          location: 'Rack B-1, Shelf 1',
          status: 'In Stock',
          supplier: 'GSK Distribution Lahore',
        },
        {
          batchId: 'BAT-1004',
          medicineId: medMap['MED-1003'],
          medicineCode: 'MED-1003',
          batchNumber: 'BRU-2026-105',
          manufacturingDate: new Date('2025-03-01'),
          expiryDate: new Date('2027-11-20'),
          purchasePrice: 52.0,
          sellingPrice: 65.0,
          quantity: 80,
          rack: 'Rack A-2',
          shelf: 'Shelf 3',
          location: 'Rack A-2, Shelf 3',
          status: 'In Stock',
          supplier: 'Abbott Logistics',
        },
        {
          batchId: 'BAT-1005',
          medicineId: medMap['MED-1004'],
          medicineCode: 'MED-1004',
          batchNumber: 'RIS-2026-302',
          manufacturingDate: new Date('2025-01-20'),
          expiryDate: new Date('2027-08-15'),
          purchasePrice: 155.0,
          sellingPrice: 190.0,
          quantity: 12,
          rack: 'Rack C-1',
          shelf: 'Shelf 2',
          location: 'Rack C-1, Shelf 2',
          status: 'Low Stock',
          supplier: 'Getz Supply Chain',
        },
      ]);
      console.log('[Seeder] Initial medicines and batches seeded.');
    } else {
      // Ensure all medicines have isActive set to true if undefined
      await Medicine.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });

      // Direct native migration of legacy batch records to store Medicine ObjectId references
      const db = mongoose.connection.db;
      if (db) {
        const rawBatches = await db.collection('batches').find().toArray();
        for (const b of rawBatches) {
          if (typeof b.medicineId === 'string' && !mongoose.Types.ObjectId.isValid(b.medicineId)) {
            const med = await Medicine.findOne({ medicineId: b.medicineId });
            if (med) {
              await db.collection('batches').updateOne(
                { _id: b._id },
                {
                  $set: {
                    medicineId: med._id,
                    medicineCode: med.medicineId,
                  },
                }
              );
            }
          } else if (b.medicineId && !b.medicineCode) {
            const med = await Medicine.findById(b.medicineId);
            if (med) {
              await db.collection('batches').updateOne(
                { _id: b._id },
                { $set: { medicineCode: med.medicineId } }
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Seeder] Error in seedInitialData:', err.message);
  }
};

module.exports = seedInitialData;
