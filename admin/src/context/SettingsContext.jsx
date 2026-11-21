import { useState, useEffect, useCallback } from 'react';
import { SettingsContext } from './contexts';
import { settingsService } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../data/initialSettings';

const SETTINGS_STORAGE_KEY = 'abm_store_settings_v3';

const getCachedSettings = () => {
  try {
    const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    // ignore json parse error
  }
  return DEFAULT_SETTINGS;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getCachedSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep document title synchronized with store name
  useEffect(() => {
    if (settings?.storeName) {
      document.title = `${settings.storeName} - ${settings.tagline || 'Pharmacy System'}`;
    }
  }, [settings?.storeName, settings?.tagline]);

  // Fetch settings dynamically from backend REST API
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await settingsService.getSettings();
      if (res?.data) {
        setSettings((prev) => {
          const merged = { ...prev, ...res.data };
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {
            // ignore storage quota
          }
          return merged;
        });
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

    // Optimistic local update & localStorage persistence
    setSettings((prev) => {
      const updated = { ...prev, ...sanitized };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        // ignore storage error
      }
      return updated;
    });

    try {
      const res = await settingsService.updateSettings(sanitized);
      if (res?.data) {
        setSettings((prev) => {
          const finalSettings = { ...prev, ...res.data };
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(finalSettings));
          } catch (e) {
            // ignore
          }
          return finalSettings;
        });
        return res.data;
      }
      return sanitized;
    } catch (err) {
      console.error('[SettingsContext] Failed to save settings to API:', err);
      throw err;
    }
  }, []);

  // Reset entire application data back to initial seeds via backend API
  const resetDemoData = useCallback(async () => {
    try {
      await settingsService.resetDemoData();
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
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
