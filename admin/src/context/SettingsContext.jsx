import { useState, useEffect, useCallback } from 'react';
import { SettingsContext } from './contexts';
import { storage } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/constants';
import { DEFAULT_SETTINGS } from '../data/initialSettings';
import { INITIAL_MEDICINES } from '../data/initialMedicines';
import { INITIAL_BATCHES } from '../data/initialBatches';
import { INITIAL_CATEGORIES } from '../data/initialCategories';
import { INITIAL_STOCK_HISTORY } from '../data/initialStockHistory';
import { INITIAL_SALES } from '../data/initialSales';
import { INITIAL_USERS } from '../data/initialUsers';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    return storage.get(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  });

  // Sync settings with localStorage
  useEffect(() => {
    storage.set(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  // Update store settings
  const updateSettings = useCallback((newValues) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        ...newValues,
        lowStockThreshold: Math.max(1, Number(newValues.lowStockThreshold) || prev.lowStockThreshold),
        nearExpiryDays: Math.max(1, Number(newValues.nearExpiryDays) || prev.nearExpiryDays),
      };
      storage.set(STORAGE_KEYS.SETTINGS, updated);
      return updated;
    });
  }, []);

  // Reset entire application data back to initial seeds
  const resetDemoData = useCallback(() => {
    storage.set(STORAGE_KEYS.MEDICINES, INITIAL_MEDICINES);
    storage.set(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    storage.set(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    storage.set(STORAGE_KEYS.STOCK_HISTORY, INITIAL_STOCK_HISTORY);
    storage.set(STORAGE_KEYS.SALES, INITIAL_SALES);
    storage.set(STORAGE_KEYS.EMPLOYEES, INITIAL_USERS);
    storage.set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);

    // Broadcast or reload to sync all contexts cleanly
    window.location.reload();
  }, []);

  const restoreSeedData = useCallback(() => {
    resetDemoData();
  }, [resetDemoData]);

  const value = {
    settings,
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
