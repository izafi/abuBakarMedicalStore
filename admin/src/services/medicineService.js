import apiClient from './apiClient';

export const medicineService = {
  getMedicines: async (params = {}) => {
    return apiClient.get('/medicines', params);
  },

  getMedicineById: async (id) => {
    return apiClient.get(`/medicines/${id}`);
  },

  createMedicine: async (data) => {
    return apiClient.post('/medicines', data);
  },

  updateMedicine: async (id, data) => {
    return apiClient.put(`/medicines/${id}`, data);
  },

  deleteMedicine: async (id) => {
    return apiClient.delete(`/medicines/${id}`);
  },

  getCategories: async () => {
    return apiClient.get('/medicines/categories');
  },

  getTypes: async () => {
    return apiClient.get('/medicines/types');
  },

  searchCounter: async (query) => {
    return apiClient.get('/medicines/search', { q: query });
  },

  getCounterCatalog: async () => {
    return apiClient.get('/medicines/counter/catalog');
  },

  getAvailableBatches: async (id) => {
    return apiClient.get(`/medicines/${id}/available-batches`);
  },
};

export default medicineService;
