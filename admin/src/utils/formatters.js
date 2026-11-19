import { APP_INFO, BATCH_STOCK_STATUS } from './constants.js';

/**
 * Format number to currency string
 * e.g., 1450.5 -> "Rs. 1,450.50"
 */
export const formatCurrency = (amount, currency = APP_INFO.DEFAULT_CURRENCY) => {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format ISO date string or Date object to readable date
 * e.g. "2026-11-18" -> "Nov 18, 2026"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

/**
 * Format date with time
 * e.g. "Nov 18, 2026, 10:30 AM"
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Calculate days remaining until expiry
 */
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return 0;
  const target = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Generate human-readable invoice reference number
 */
export const generateInvoiceNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ABM-${dateStr}-${randomSuffix}`;
};

/**
 * Calculate the exact batch stock status based on expiration and quantity
 */
export const getBatchStockStatus = (batch, minStockAlert = 15, nearExpiryDays = 60) => {
  if (!batch) return BATCH_STOCK_STATUS.OUT_OF_STOCK;

  const days = getDaysUntilExpiry(batch.expiryDate);
  const qty = Number(batch.quantity) || 0;

  if (days < 0) {
    return BATCH_STOCK_STATUS.EXPIRED;
  }
  if (qty <= 0) {
    return BATCH_STOCK_STATUS.OUT_OF_STOCK;
  }
  if (days <= nearExpiryDays) {
    return BATCH_STOCK_STATUS.NEAR_EXPIRY;
  }
  if (qty <= minStockAlert) {
    return BATCH_STOCK_STATUS.LOW_STOCK;
  }
  return BATCH_STOCK_STATUS.IN_STOCK;
};

/**
 * Check if a batch is legally and physically sellable
 * Rule: Expired batches cannot be sold, and quantity must be > 0.
 */
export const canSellBatch = (batch) => {
  if (!batch) return false;
  const days = getDaysUntilExpiry(batch.expiryDate);
  const qty = Number(batch.quantity) || 0;
  return days >= 0 && qty > 0;
};

/**
 * Extract clean product name without redundant type or strength
 * e.g. "Amoxil Syrup 125mg/5ml" (type: Syrup, strength: 125mg/5ml) -> "Amoxil"
 * e.g. "Augmentin 625mg" -> "Augmentin"
 * e.g. "Brufen 400mg" -> "Brufen"
 */
export const getCleanMedicineName = (med) => {
  if (!med) return '';
  if (med.brand && typeof med.brand === 'string' && med.brand.trim()) {
    return med.brand.trim();
  }

  let clean = med.name || '';
  const strength = (med.strength || '').trim();
  const type = (med.type || '').trim();

  if (strength) {
    const escapedStrength = strength.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\b${escapedStrength}\\b`, 'gi'), '');
    clean = clean.replace(new RegExp(escapedStrength, 'gi'), '');
  }

  if (type) {
    const escapedType = type.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    clean = clean.replace(new RegExp(`\\b${escapedType}\\b`, 'gi'), '');
    clean = clean.replace(new RegExp(escapedType, 'gi'), '');
  }

  clean = clean.replace(/\s+/g, ' ').replace(/[-,/]+$/, '').trim();
  return clean || med.name || '';
};

