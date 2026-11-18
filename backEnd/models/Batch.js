const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    medicineId: {
      type: String,
      required: [true, 'Parent medicineId is required'],
      ref: 'Medicine',
      index: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch Number is required'],
      trim: true,
      index: true,
    },
    manufacturingDate: {
      type: Date,
      required: [true, 'Manufacturing date is required'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Batch quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    rack: {
      type: String,
      default: 'Rack A-1',
    },
    shelf: {
      type: String,
      default: 'Shelf 1',
    },
    location: {
      type: String,
      default: 'Rack A-1, Shelf 1',
    },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Near Expiry', 'Expired'],
      default: 'In Stock',
      index: true,
    },
    supplier: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of batchNumber per medicine
batchSchema.index({ medicineId: 1, batchNumber: 1 });

module.exports = mongoose.model('Batch', batchSchema);
