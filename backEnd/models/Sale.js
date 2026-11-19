const mongoose = require('mongoose');

const PAYMENT_METHODS = ['Cash', 'Card'];
const SALE_STATUSES = ['Completed', 'Cancelled', 'Refunded'];

const embeddedItemSchema = new mongoose.Schema(
  {
    medicineId: { type: String, required: true },
    medicineName: { type: String, required: true },
    genericName: { type: String, default: '' },
    formula: { type: String, default: '' },
    strength: { type: String, default: '' },
    batchId: { type: String, required: true },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountPercentage: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
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
    patientName: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      index: true,
    },
    prescription: {
      type: String,
      required: [true, 'Prescription description is required'],
      trim: true,
    },
    prescriptionRef: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    // Compatibility aliases
    prescriptionDescription: {
      type: String,
      trim: true,
    },
    prescriptionReferenceNumber: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    employeeId: {
      type: String,
      required: [true, 'Employee identifier is required'],
      index: true,
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
      default: 'Staff Pharmacist',
    },
    employeeUsername: {
      type: String,
      default: '',
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method. Allowed: Cash, Card',
      },
      default: 'Cash',
      index: true,
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
      min: [0, 'Final amount cannot be negative'],
    },
    grandTotal: {
      type: Number,
      min: [0, 'Grand total cannot be negative'],
    },
    amountReceived: {
      type: Number,
      default: 0,
    },
    changeReturned: {
      type: Number,
      default: 0,
    },
    saleDateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: SALE_STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Completed',
      index: true,
    },
    items: {
      type: [embeddedItemSchema],
      validate: [(val) => val && val.length > 0, 'Sale must include at least one medicine item'],
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to keep aliases synchronized
saleSchema.pre('save', function () {
  if (!this.prescriptionDescription) {
    this.prescriptionDescription = this.prescription;
  }
  if (!this.prescription) {
    this.prescription = this.prescriptionDescription;
  }

  if (!this.prescriptionReferenceNumber) {
    this.prescriptionReferenceNumber = this.prescriptionRef;
  }
  if (!this.prescriptionRef) {
    this.prescriptionRef = this.prescriptionReferenceNumber;
  }

  if (this.grandTotal === undefined || this.grandTotal === null) {
    this.grandTotal = this.finalAmount;
  }
  if (this.finalAmount === undefined || this.finalAmount === null) {
    this.finalAmount = this.grandTotal;
  }

  if (this.discountAmount === undefined || this.discountAmount === null) {
    this.discountAmount = this.totalDiscount;
  }
  if (this.totalDiscount === undefined || this.totalDiscount === null) {
    this.totalDiscount = this.discountAmount;
  }

  if (!this.date) {
    this.date = this.saleDateTime || new Date();
  }
  if (!this.saleDateTime) {
    this.saleDateTime = this.date || new Date();
  }
});

module.exports = mongoose.model('Sale', saleSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
