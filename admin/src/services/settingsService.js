import apiClient from './apiClient';

export const settingsService = {
  getSettings: async () => {
    return apiClient.get('/settings');
  },

  updateSettings: async (settingsData) => {
    return apiClient.put('/settings', settingsData);
  },

  updateStore: async (storeData) => {
    return apiClient.patch('/settings/store', storeData);
  },

  updateInventorySettings: async (inventoryData) => {
    return apiClient.patch('/settings/inventory', inventoryData);
  },

  resetDemoData: async () => {
    return apiClient.post('/settings/reset-demo-data');
  },
};

export default settingsService;
