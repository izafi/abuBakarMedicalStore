const mongoose = require('mongoose');

const BATCH_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock', 'Near Expiry', 'Expired'];

const batchSchema = new mongoose.Schema(
  {
    medicineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: [true, 'Medicine ObjectId reference is required'],
      index: true,
    },
    medicineCode: {
      type: String,
      trim: true,
      index: true,
    },
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      unique: true,
      trim: true,
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
      trim: true,
    },
    shelf: {
      type: String,
      default: 'Shelf 1',
      trim: true,
    },
    location: {
      type: String,
      default: 'Rack A-1, Shelf 1',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: BATCH_STATUSES,
        message: '{VALUE} is not a valid batch status',
      },
      default: 'In Stock',
      index: true,
    },
    supplier: {
      type: String,
      trim: true,
      default: '',
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
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of batchNumber per medicine
batchSchema.index({ medicineId: 1, batchNumber: 1 }, { unique: true });

// Pre-save hook to validate dates and auto-update location & status
batchSchema.pre('save', function () {
  if (this.manufacturingDate && this.expiryDate && this.manufacturingDate > this.expiryDate) {
    throw new Error('Manufacturing date cannot be later than expiry date.');
  }

  const now = new Date();
  const diffTime = this.expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const qty = Number(this.quantity) || 0;

  if (daysLeft < 0) {
    this.status = 'Expired';
  } else if (qty <= 0) {
    this.status = 'Out of Stock';
  } else if (daysLeft <= 60) {
    this.status = 'Near Expiry';
  } else if (qty <= 15) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }

  if (this.rack || this.shelf) {
    this.location = `${this.rack || 'Rack A-1'}, ${this.shelf || 'Shelf 1'}`;
  }
});

module.exports = mongoose.model('Batch', batchSchema);
module.exports.BATCH_STATUSES = BATCH_STATUSES;
