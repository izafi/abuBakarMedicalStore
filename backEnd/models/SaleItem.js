const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: [true, 'Sale reference is required'],
      index: true,
    },
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine reference is required'],
      index: true,
    },
    medicineCode: {
      type: String,
      trim: true,
      index: true,
    },
    medicineName: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    genericName: {
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
      trim: true,
      default: '',
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: [true, 'Batch reference is required'],
      index: true,
    },
    batchCode: {
      type: String,
      trim: true,
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: [0, 'Discount percent cannot be negative'],
      max: [100, 'Discount percent cannot exceed 100%'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    total: {
      type: Number,
      required: [true, 'Item total is required'],
      min: [0, 'Total cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SaleItem', saleItemSchema);
