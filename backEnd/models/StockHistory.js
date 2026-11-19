const mongoose = require('mongoose');

const ACTION_TYPES = [
  'ADD',
  'UPDATE',
  'REMOVE',
  'SALE',
  'RETURN',
  // Backwards compatibility mappings
  'Add Stock',
  'Update Stock',
  'Remove Stock',
  'Sale Deduction',
  'Disposal / Waste',
  'Supplier Return',
];

const stockHistorySchema = new mongoose.Schema(
  {
    stockHistoryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    medicineId: {
      type: String,
      required: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    changedQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
    },
    actionType: {
      type: String,
      required: true,
      enum: ACTION_TYPES,
      index: true,
    },
    employeeId: {
      type: String,
      default: 'STAFF-01',
      index: true,
    },
    employeeName: {
      type: String,
      default: 'Staff Pharmacist',
    },
    reason: {
      type: String,
      trim: true,
      default: '',
    },
    dateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to keep dateTime and timestamp synced
stockHistorySchema.pre('save', function () {
  if (!this.dateTime) {
    this.dateTime = this.timestamp || new Date();
  }
  if (!this.timestamp) {
    this.timestamp = this.dateTime || new Date();
  }
});

module.exports = mongoose.model('StockHistory', stockHistorySchema);
module.exports.ACTION_TYPES = ACTION_TYPES;
