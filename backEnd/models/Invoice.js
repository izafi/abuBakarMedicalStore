const mongoose = require('mongoose');

const PAYMENT_METHODS = ['Cash', 'Card'];
const INVOICE_STATUSES = ['Issued', 'Paid', 'Cancelled', 'Refunded'];

const invoiceItemSchema = new mongoose.Schema(
  {
    medicineId: { type: String, required: true },
    medicineCode: { type: String, default: '' },
    medicineName: { type: String, required: true },
    genericName: { type: String, default: '' },
    formula: { type: String, default: '' },
    strength: { type: String, default: '' },
    batchId: { type: String, required: true },
    batchCode: { type: String, default: '' },
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale',
      required: [true, 'Sale reference ID is required'],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    patientName: {
      type: String,
      default: 'Walk-in Customer',
      trim: true,
      index: true,
    },
    doctorName: {
      type: String,
      default: 'Self / Counter',
      trim: true,
      index: true,
    },
    prescription: {
      type: String,
      trim: true,
      default: 'N/A',
    },
    prescriptionRef: {
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
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    totalDiscount: {
      type: Number,
      default: 0,
      min: [0, 'Total discount cannot be negative'],
    },
    grandTotal: {
      type: Number,
      required: [true, 'Grand total is required'],
      min: [0, 'Grand total cannot be negative'],
    },
    finalAmount: {
      type: Number,
      min: [0, 'Final amount cannot be negative'],
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
    amountReceived: {
      type: Number,
      default: 0,
    },
    changeReturned: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: INVOICE_STATUSES,
        message: '{VALUE} is not a valid invoice status',
      },
      default: 'Paid',
      index: true,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save synchronization hook
invoiceSchema.pre('save', function () {
  if (this.totalDiscount === undefined || this.totalDiscount === null) {
    this.totalDiscount = this.discount || 0;
  }
  if (this.discount === undefined || this.discount === null) {
    this.discount = this.totalDiscount || 0;
  }

  if (this.finalAmount === undefined || this.finalAmount === null) {
    this.finalAmount = this.grandTotal;
  }
  if (this.grandTotal === undefined || this.grandTotal === null) {
    this.grandTotal = this.finalAmount;
  }

  if (!this.invoiceDate) {
    this.invoiceDate = new Date();
  }
});

// Full-text search index on invoiceNumber, patientName, doctorName, employeeName
invoiceSchema.index({
  invoiceNumber: 'text',
  patientName: 'text',
  doctorName: 'text',
  employeeName: 'text',
});

module.exports = mongoose.model('Invoice', invoiceSchema);
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.INVOICE_STATUSES = INVOICE_STATUSES;
