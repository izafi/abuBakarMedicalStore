import apiClient from './apiClient';

export const reportService = {
  getReport: async (reportName, params = {}) => {
    return apiClient.get(`/reports/${reportName}`, params);
  },

  getSalesReport: async (params = {}) => {
    return apiClient.get('/reports/sales', params);
  },

  getInventoryReport: async (params = {}) => {
    return apiClient.get('/reports/inventory', params);
  },

  getDashboardSummary: async () => {
    return apiClient.get('/dashboard/summary');
  },

  getDashboardTrends: async (params = {}) => {
    return apiClient.get('/dashboard/trends', params);
  },
};

export default reportService;
