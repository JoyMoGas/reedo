/**
 * @project Reedo
 * @module api
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date 2026-05-30
 */
import axios from 'axios';
import { useAuthStore } from './useAuthStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';

const api = axios.create({
  baseURL: `${API_URL}:${API_PORT}/`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && !config.headers.Authorization) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('API returned 401 Unauthorized. Logging out...');
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
