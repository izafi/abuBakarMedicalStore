/**
 * Application Constants
 * Abu Bakar Medical Store
 */

export const APP_INFO = {
  NAME: 'Abu Bakar Medical Store',
  TAGLINE: 'PHARMACY INVENTORY SYSTEM',
  SHORT_NAME: 'ABM Pharmacy',
  VERSION: '2.0.0',
  DEFAULT_CURRENCY: 'Rs.',
  CURRENCY_CODE: 'PKR',
  DEFAULT_TAX_RATE: 0,
  CONTACT_PHONE: '+92 300 1234567',
  STORE_ADDRESS: 'Main Bazar, Medical Market, Pakistan',
};

export const STORAGE_KEYS = {
  MEDICINES: 'abm_medicines_registry_v2',
  BATCHES: 'abm_medicine_batches_v2',
  STOCK_HISTORY: 'abm_stock_history_v2',
  SALES: 'abm_sales_invoices_v2',
  EMPLOYEES: 'abm_employees_registry_v2',
  AUTH_USER: 'abm_auth_session_v2',
  CATEGORIES: 'abm_categories_v2',
  SETTINGS: 'abm_store_settings_v2',
};

export const USER_ROLES = {
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee',
};

export const EMPLOYEE_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const PERMISSION_MODULES = {
  MEDICINES: 'medicines',
  INVENTORY: 'inventory',
  SALES: 'sales',
  EMPLOYEES: 'employees',
  REPORTS: 'reports',
};

export const PERMISSION_ACTIONS = {
  VIEW: 'view',
  ADD: 'add',
  EDIT: 'edit',
  DELETE: 'delete',
};

export const DEFAULT_ADMIN_PERMISSIONS = {
  [PERMISSION_MODULES.MEDICINES]: { view: true, add: true, edit: true, delete: true },
  [PERMISSION_MODULES.INVENTORY]: { view: true, add: true, edit: true, delete: true },
  [PERMISSION_MODULES.SALES]: { view: true, add: true, edit: true, delete: true },
  [PERMISSION_MODULES.EMPLOYEES]: { view: true, add: true, edit: true, delete: true },
  [PERMISSION_MODULES.REPORTS]: { view: true, add: true, edit: true, delete: true },
};

export const DEFAULT_EMPLOYEE_PERMISSIONS = {
  [PERMISSION_MODULES.MEDICINES]: { view: true, add: true, edit: true, delete: false },
  [PERMISSION_MODULES.INVENTORY]: { view: true, add: true, edit: false, delete: false },
  [PERMISSION_MODULES.SALES]: { view: true, add: true, edit: true, delete: false },
  [PERMISSION_MODULES.EMPLOYEES]: { view: false, add: false, edit: false, delete: false },
  [PERMISSION_MODULES.REPORTS]: { view: true, add: false, edit: false, delete: false },
};

export const MEDICINE_TYPES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Liquid',
  'Injection',
  'Cream',
  'Drops',
  'Inhaler',
  'Ointment',
  'Other',
];

export const PAYMENT_METHODS = {
  CASH: 'Cash',
  CARD: 'Debit/Credit Card',
  ONLINE: 'Online / EasyPaisa / JazzCash',
};

export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

// Official 5 Stock Statuses required for Batch & Inventory Management
export const BATCH_STOCK_STATUS = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
  NEAR_EXPIRY: 'Near Expiry',
  EXPIRED: 'Expired',
};

// Official Stock Movement Action Types for Stock History audit log
export const STOCK_ACTION_TYPES = {
  ADD_STOCK: 'Add Stock',
  UPDATE_STOCK: 'Update Stock',
  REMOVE_STOCK: 'Remove Stock',
  SALE_DEDUCTION: 'Sale Deduction',
  DISPOSAL: 'Disposal / Waste',
  RETURN: 'Supplier Return',
};

export const EXPIRY_STATUS = {
  VALID: 'valid',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
};
