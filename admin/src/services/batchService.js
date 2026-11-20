import apiClient from './apiClient';

export const batchService = {
  getBatches: async (params = {}) => {
    return apiClient.get('/batches', params);
  },

  getBatchById: async (id) => {
    return apiClient.get(`/batches/${id}`);
  },

  getBatchesByMedicine: async (medicineId) => {
    return apiClient.get(`/batches/medicine/${medicineId}`);
  },

  createBatch: async (data) => {
    return apiClient.post('/batches', data);
  },

  updateBatch: async (id, data) => {
    return apiClient.put(`/batches/${id}`, data);
  },

  deleteBatch: async (id) => {
    return apiClient.delete(`/batches/${id}`);
  },

  getNearExpiry: async () => {
    return apiClient.get('/batches/near-expiry');
  },

  getExpired: async () => {
    return apiClient.get('/batches/expired');
  },
};

export default batchService;
