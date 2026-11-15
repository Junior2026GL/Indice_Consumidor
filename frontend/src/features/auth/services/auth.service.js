import { api, authClient } from '../../../services/api.js';
import { setAccessToken } from '../../../services/session.js';

export async function login(credentials) {
  const { data } = await authClient.post('/auth/login', credentials);
  setAccessToken(data.data.token);
  return data.data.user;
}

export async function logout() {
  try {
    await authClient.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export async function changeMyPassword({ currentPassword, newPassword }) {
  const { data } = await api.put('/auth/password', { currentPassword, newPassword });
  // El backend cierra las demás sesiones y entrega un token nuevo para esta.
  setAccessToken(data.data.token);
  return data.data.user;
}
