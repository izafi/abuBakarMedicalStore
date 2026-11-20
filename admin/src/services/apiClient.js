/**
 * Centralized API Client for Abu Bakar Medical Store
 * Connects directly to Node.js / Express REST API backend
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000/api/v1'
    : '/api/v1');

let authToken = null;

// Allow token to be stored in memory for authenticated requests
export const setAuthToken = (token) => {
  authToken = token;
};

export const getAuthToken = () => {
  return authToken;
};

/**
 * Core HTTP Request Wrapper
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Include HTTP-only cookies if present
  };

  try {
    const res = await fetch(url, config);
    let data = null;

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { message: text };
    }

    if (!res.ok) {
      const errorMsg =
        data?.message ||
        (Array.isArray(data?.errors) ? data.errors.join(', ') : null) ||
        `Request failed with status ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.warn(`[ABM API] Network connection failed for ${url}. Is backend running on port 5000?`);
    }
    throw error;
  }
}

export const apiClient = {
  get: (endpoint, params = null) => {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.append(key, val);
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return request(url, { method: 'GET' });
  },

  post: (endpoint, body = {}) => {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put: (endpoint, body = {}) => {
    return request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch: (endpoint, body = {}) => {
    return request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete: (endpoint) => {
    return request(endpoint, { method: 'DELETE' });
  },
};

export default apiClient;
