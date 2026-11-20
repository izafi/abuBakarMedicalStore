import apiClient from './apiClient';

export const salesService = {
  getSales: async (params = {}) => {
    return apiClient.get('/sales', params);
  },

  getSaleById: async (id) => {
    return apiClient.get(`/sales/${id}`);
  },

  getTodaySales: async () => {
    return apiClient.get('/sales/today');
  },

  getSalesSummary: async () => {
    return apiClient.get('/sales/summary');
  },

  getSalesHistory: async (params = {}) => {
    return apiClient.get('/sales/history', params);
  },

  createSale: async (saleData) => {
    return apiClient.post('/sales', saleData);
  },

  checkout: async (checkoutData) => {
    return apiClient.post('/sales/checkout', checkoutData);
  },

  getInvoice: async (invoiceNumber) => {
    return apiClient.get(`/invoices/${invoiceNumber}`);
  },
};

export default salesService;
