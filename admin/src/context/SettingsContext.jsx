import { useState, useEffect, useCallback } from 'react';
import { SettingsContext } from './contexts';
import { settingsService } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../data/initialSettings';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch settings dynamically from backend REST API
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await settingsService.getSettings();
      if (res?.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data,
        }));
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

  // Update store settings dynamically via backend API
  const updateSettings = useCallback(async (newValues) => {
    const sanitized = {
      ...newValues,
      lowStockThreshold: Math.max(1, Number(newValues.lowStockThreshold) || 10),
      nearExpiryDays: Math.max(1, Number(newValues.nearExpiryDays) || 60),
    };

    // Optimistic local update
    setSettings((prev) => ({ ...prev, ...sanitized }));

    try {
      const res = await settingsService.updateSettings(sanitized);
      if (res?.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
      return res?.data;
    } catch (err) {
      console.error('[SettingsContext] Failed to save settings to API:', err);
      throw err;
    }
  }, []);

  // Reset entire application data back to initial seeds via backend API
  const resetDemoData = useCallback(async () => {
    try {
      await settingsService.resetDemoData();
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
