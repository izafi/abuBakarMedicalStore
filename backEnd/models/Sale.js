const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    medicineId: { type: String, required: true },
    batchId: { type: String, required: true },
    medicineName: { type: String, required: true },
    genericName: { type: String },
    formula: { type: String },
    strength: { type: String },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    finalTotal: { type: Number, required: true },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    doctorName: {
      type: String,
      required: [true, 'Prescribing doctor name is required'],
      trim: true,
    },
    prescriptionDescription: {
      type: String,
      required: [true, 'Prescription description is required'],
      trim: true,
    },
    prescriptionReferenceNumber: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    employeeName: {
      type: String,
      required: [true, 'Dispensing employee name is required'],
    },
    employeeUsername: {
      type: String,
    },
    employeeId: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'Debit/Credit Card', 'Online / EasyPaisa / JazzCash'],
      default: 'Cash',
      index: true,
    },
    amountReceived: {
      type: Number,
      default: 0,
    },
    changeReturned: {
      type: Number,
      default: 0,
    },
    items: {
      type: [saleItemSchema],
      validate: [(val) => val.length > 0, 'Sale must include at least one medicine item'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Completed', 'Cancelled', 'Refunded'],
      default: 'Completed',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Sale', saleSchema);
