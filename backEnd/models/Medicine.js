const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    medicineId: {
      type: String,
      required: [true, 'Medicine ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Medicine brand name is required'],
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      required: [true, 'Generic formula name is required'],
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    formula: {
      type: String,
      trim: true,
    },
    strength: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'Tablet',
        'Capsule',
        'Syrup',
        'Liquid',
        'Injection',
        'Cream',
        'Drops',
        'Inhaler',
        'Ointment',
        'Other',
      ],
      default: 'Tablet',
    },
    category: {
      type: String,
      default: 'General',
      index: true,
    },
    usage: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    rack: {
      type: String,
      default: 'Rack A',
    },
    shelf: {
      type: String,
      default: 'Shelf 1',
    },
    minStockAlert: {
      type: Number,
      default: 15,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound text search index
medicineSchema.index({
  name: 'text',
  genericName: 'text',
  brand: 'text',
  formula: 'text',
  category: 'text',
});

module.exports = mongoose.model('Medicine', medicineSchema);
