/**
 * Storage Utilities (Deprecated - Abu Bakar Medical Store is 100% Dynamic API & Database Driven)
 * This utility clears any obsolete local storage data and prevents business data caching.
 */

if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const keysToRemove = [
      'abm_medicines_v3',
      'abm_batches_v3',
      'abm_stock_history_v3',
      'abm_sales_v3',
      'abm_employees_v3',
      'abm_auth_session_v3',
      'abm_categories_v3',
      'abm_store_settings_v3',
      'abm_medicines_registry_v2',
      'abm_medicine_batches_v2',
      'abm_stock_history_v2',
      'abm_sales_invoices_v2',
      'abm_employees_registry_v2',
      'abm_auth_session_v2',
      'abm_categories_v2',
      'abm_store_settings_v2',
    ];
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // Ignore storage clear errors
  }
}

export const storage = {
  get: () => null,
  set: () => false,
  remove: () => true,
  clear: () => true,
};

export default storage;
