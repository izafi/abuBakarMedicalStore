const mongoose = require('mongoose');

const MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Liquid',
  'Injection',
  'Cream',
  'Drops',
  'Inhaler',
  'Ointment',
  'Gel',
  'Other',
];

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
      required: [true, 'Medicine name is required'],
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
      default: '',
    },
    formula: {
      type: String,
      trim: true,
      default: '',
    },
    strength: {
      type: String,
      required: [true, 'Strength is required (e.g. 500mg, 10ml)'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Medicine type is required'],
      enum: {
        values: MEDICINE_TYPES,
        message: '{VALUE} is not a valid medicine type',
      },
      default: 'Tablet',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'General',
      index: true,
    },
    usage: {
      type: String,
      trim: true,
      default: '',
    },
    manufacturer: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    // Optional display/catalog defaults (Note: batch quantities are NOT stored here)
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, 'Selling price cannot be negative'],
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Purchase price cannot be negative'],
    },
    rack: {
      type: String,
      default: 'Rack A-1',
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

// Compound text search index for fast text search
medicineSchema.index({
  name: 'text',
  genericName: 'text',
  brand: 'text',
  formula: 'text',
  category: 'text',
});

module.exports = mongoose.model('Medicine', medicineSchema);
module.exports.MEDICINE_TYPES = MEDICINE_TYPES;
