const mongoose = require('mongoose');

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
      enum: [
        'Add Stock',
        'Update Stock',
        'Remove Stock',
        'Sale Deduction',
        'Disposal / Waste',
        'Supplier Return',
      ],
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      default: 'STAFF-01',
    },
    employeeName: {
      type: String,
      default: 'Staff Pharmacist',
    },
    reason: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StockHistory', stockHistorySchema);
