import apiClient, { setAuthToken } from './apiClient';

export const authService = {
  login: async (username, password) => {
    const res = await apiClient.post('/auth/login', { username, password });
    if (res?.data?.token) {
      setAuthToken(res.data.token);
    }
    return res;
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAuthToken(null);
    }
  },

  getMe: async () => {
    return apiClient.get('/auth/me');
  },

  getDemoAccounts: async () => {
    return apiClient.get('/auth/demo-accounts');
  },

  verifyPassword: async (password) => {
    return apiClient.post('/auth/verify-password', { password });
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    return apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  forgotPassword: async ({ email, username, newPassword }) => {
    return apiClient.post('/auth/forgot-password', { email, username, newPassword });
  },

  register: async (employeeData) => {
    return apiClient.post('/auth/register', employeeData);
  },
};

export default authService;
