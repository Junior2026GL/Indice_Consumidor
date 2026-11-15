import axios from 'axios';
import { API_URL } from '../config/env.js';
import { getAccessToken, notifySessionExpired, setAccessToken } from './session.js';

const baseConfig = {
  baseURL: API_URL,
  withCredentials: true, // envía la cookie HttpOnly de renovación
  timeout: 20_000,
  // El backend exige esta cabecera en /auth/refresh y /auth/logout (defensa CSRF).
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
};

/** Cliente sin interceptores, para login / refresh / logout (evita bucles de reintento). */
export const authClient = axios.create(baseConfig);

export const api = axios.create(baseConfig);

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Una sola renovación en curso aunque varias peticiones fallen a la vez con 401.
let refreshing = null;

export function refreshSession() {
  if (!refreshing) {
    refreshing = authClient
      .post('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.data.token);
        return data.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    if (response?.status === 401 && config && !config._retried) {
      config._retried = true;
      try {
        await refreshSession();
        config.headers.Authorization = `Bearer ${getAccessToken()}`;
        return api(config);
      } catch {
        notifySessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = 'Ocurrió un error inesperado') {
  if (error?.code === 'ERR_CANCELED') return '';
  if (!error?.response) return 'No se pudo conectar con el servidor';
  return error.response.data?.message || fallback;
}
