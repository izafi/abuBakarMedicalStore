/**
 * Storage Utilities (Deprecated - Abu Bakar Medical Store is 100% Dynamic API & Database Driven)
 * This utility immediately purges all localStorage and sessionStorage data.
 */

if (typeof window !== 'undefined') {
  try {
    if (window.localStorage) {
      window.localStorage.clear();
    }
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }
  } catch (e) {
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
