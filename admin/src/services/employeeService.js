import apiClient from './apiClient';

export const employeeService = {
  getEmployees: async () => {
    return apiClient.get('/employees');
  },

  getEmployeeById: async (id) => {
    return apiClient.get(`/employees/${id}`);
  },

  createEmployee: async (data) => {
    return apiClient.post('/employees', data);
  },

  updateEmployee: async (id, data) => {
    return apiClient.put(`/employees/${id}`, data);
  },

  deleteEmployee: async (id) => {
    return apiClient.delete(`/employees/${id}`);
  },

  toggleStatus: async (id) => {
    return apiClient.patch(`/employees/${id}/status`);
  },

  updatePermissions: async (id, permissions) => {
    return apiClient.put(`/permissions/${id}`, { permissions });
  },
};

export default employeeService;
