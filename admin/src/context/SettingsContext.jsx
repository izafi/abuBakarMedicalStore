import { useState, useEffect, useCallback } from 'react';
import { SettingsContext } from './contexts';
import { settingsService } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../data/initialSettings';

export const SettingsProvider = ({ children }) => {
  // Purely in-memory React state (Zero localStorage / sessionStorage)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Clear any residual browser storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Keep document title synchronized with store name
  useEffect(() => {
    if (settings?.storeName) {
      document.title = `${settings.storeName} - ${settings.tagline || 'Pharmacy System'}`;
    }
  }, [settings?.storeName, settings?.tagline]);

  // Fetch settings dynamically from backend REST API (MongoDB)
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await settingsService.getSettings();
      if (res?.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.warn('[SettingsContext] Could not fetch settings from backend, using baseline defaults:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update store settings dynamically via backend API & MongoDB
  const updateSettings = useCallback(async (newValues) => {
    const sanitized = {
      ...newValues,
      storeName: (newValues.storeName || '').trim() || 'Abu Bakar Medical Store',
      tagline: (newValues.tagline || '').trim() || 'PHARMACY INVENTORY SYSTEM',
      branchName: (newValues.branchName || '').trim() || 'Main Branch',
      phone: (newValues.phone || newValues.contactNumber || '').trim(),
      contactNumber: (newValues.phone || newValues.contactNumber || '').trim(),
      lowStockThreshold: Math.max(1, Number(newValues.lowStockThreshold) || 10),
      nearExpiryDays: Math.max(1, Number(newValues.nearExpiryDays) || 60),
    };

    // Optimistic in-memory update
    setSettings((prev) => ({ ...prev, ...sanitized }));

    try {
      const res = await settingsService.updateSettings(sanitized);
      if (res?.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
        return res.data;
      }
      return sanitized;
    } catch (err) {
      console.error('[SettingsContext] Failed to save settings to API:', err);
      // Revert/refresh on error
      fetchSettings();
      throw err;
    }
  }, [fetchSettings]);

  // Reset entire application data back to initial seeds via backend API
  const resetDemoData = useCallback(async () => {
    try {
      await settingsService.resetDemoData();
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.sessionStorage.clear();
      }
    } catch (err) {
      console.warn('[SettingsContext] Backend reset demo endpoint error:', err.message);
    }
    // Refresh settings and trigger window reload to re-fetch all dynamic modules
    window.location.reload();
  }, []);

  const restoreSeedData = useCallback(() => {
    return resetDemoData();
  }, [resetDemoData]);

  const value = {
    settings,
    isLoading,
    error,
    refreshSettings: fetchSettings,
    updateSettings,
    resetDemoData,
    restoreSeedData,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;
