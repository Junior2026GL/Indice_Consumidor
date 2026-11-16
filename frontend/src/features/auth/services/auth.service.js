import { api, authClient } from '../../../services/api.js';
import { setAccessToken } from '../../../services/session.js';

export async function login(credentials) {
  const { data } = await authClient.post('/auth/login', credentials);
  setAccessToken(data.data.token);
  return data.data.user;
}

/**
 * Cierra la sesión al instante en este equipo (borra el token) y avisa al servidor en segundo plano:
 * así el usuario no espera a la red para volver al login. Si el aviso falla, la cookie vence sola.
 */
export function logout() {
  setAccessToken(null);
  authClient.post('/auth/logout', null, { timeout: 8000 }).catch(() => {});
}

export async function changeMyPassword({ currentPassword, newPassword }) {
  const { data } = await api.put('/auth/password', { currentPassword, newPassword });
  // El backend cierra las demás sesiones y entrega un token nuevo para esta.
  setAccessToken(data.data.token);
  return data.data.user;
}
