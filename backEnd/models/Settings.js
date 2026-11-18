const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    storeName: {
      type: String,
      default: 'Abu Bakar Medical Store',
      trim: true,
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
    },
    currencySymbol: {
      type: String,
      default: 'Rs.',
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
      default: 15,
      min: 1,
    },
    nearExpiryDays: {
      type: Number,
      default: 60,
      min: 7,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
