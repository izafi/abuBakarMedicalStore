import apiClient from './apiClient';

export const inventoryService = {
  getInventory: async (params = {}) => {
    return apiClient.get('/inventory', params);
  },

  getInventorySummary: async () => {
    return apiClient.get('/inventory/summary');
  },

  getStockHistory: async (params = {}) => {
    return apiClient.get('/inventory/stock-history', params);
  },

  getStockHistoryByBatch: async (batchId) => {
    return apiClient.get(`/inventory/history/${batchId}`);
  },

  addStock: async (data) => {
    return apiClient.post('/inventory/add-stock', data);
  },

  removeStock: async (data) => {
    return apiClient.post('/inventory/remove-stock', data);
  },

  updateStock: async (data) => {
    return apiClient.put('/inventory/update-stock', data);
  },

  adjustStock: async (data) => {
    return apiClient.post('/inventory/adjust-stock', data);
  },
};

export default inventoryService;
