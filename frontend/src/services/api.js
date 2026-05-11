// frontend/src/services/api.js
// Cliente HTTP centralizado con interceptor de JWT

import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexuseco_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirigir al login si el token expiró
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('nexuseco_token');
      localStorage.removeItem('nexuseco_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
