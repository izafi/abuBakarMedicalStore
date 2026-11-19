const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'Abu Bakar Medical Store',
      trim: true,
      required: [true, 'Store name is required'],
    },
    branchName: {
      type: String,
      default: 'Main Branch',
      trim: true,
    },
    tagline: {
      type: String,
      default: 'PHARMACY INVENTORY SYSTEM',
      trim: true,
    },
    currency: {
      type: String,
      default: 'Rs',
      trim: true,
      required: [true, 'Currency is required'],
    },
    currencySymbol: {
      type: String,
      default: 'Rs.',
      trim: true,
    },
    contactNumber: {
      type: String,
      default: '+92 300 1234567',
      trim: true,
    },
    phone: {
      type: String,
      default: '+92 300 1234567',
      trim: true,
    },
    email: {
      type: String,
      default: 'info@abubakarmedical.pk',
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      default: 'Main Bazar, Medical Market, Pakistan',
      trim: true,
    },
    licenseNumber: {
      type: String,
      default: 'PB-LHR-2026-99042',
      trim: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [1, 'Low stock threshold must be at least 1'],
    },
    expiryWarningDays: {
      type: Number,
      default: 90,
      min: [1, 'Expiry warning days must be at least 1'],
    },
    nearExpiryDays: {
      type: Number,
      default: 90,
      min: [1, 'Near expiry days must be at least 1'],
    },
    updatedBy: {
      type: String,
      default: 'System Default',
      trim: true,
    },
    updatedByEmployeeId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save synchronization hook to keep aliases synchronized
settingSchema.pre('save', function () {
  // Synchronize contactNumber & phone
  if (this.contactNumber && !this.phone) {
    this.phone = this.contactNumber;
  } else if (this.phone && !this.contactNumber) {
    this.contactNumber = this.phone;
  }
  if (this.isModified('contactNumber')) {
    this.phone = this.contactNumber;
  } else if (this.isModified('phone')) {
    this.contactNumber = this.phone;
  }

  // Synchronize expiryWarningDays & nearExpiryDays
  if (this.expiryWarningDays !== undefined && (this.nearExpiryDays === undefined || this.nearExpiryDays === null)) {
    this.nearExpiryDays = this.expiryWarningDays;
  } else if (this.nearExpiryDays !== undefined && (this.expiryWarningDays === undefined || this.expiryWarningDays === null)) {
    this.expiryWarningDays = this.nearExpiryDays;
  }
  if (this.isModified('expiryWarningDays')) {
    this.nearExpiryDays = this.expiryWarningDays;
  } else if (this.isModified('nearExpiryDays')) {
    this.expiryWarningDays = this.nearExpiryDays;
  }

  // Synchronize currencySymbol
  if (this.currency && !this.currencySymbol) {
    this.currencySymbol = this.currency.endsWith('.') ? this.currency : `${this.currency}.`;
  }
});

const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

module.exports = Setting;
