import { api, authClient } from '../../../services/api.js';
import { setAccessToken } from '../../../services/session.js';

/**
 * Paso 1 del login. Devuelve el usuario, o { requires2fa: true, challengeToken } si la cuenta
 * tiene verificación en dos pasos (en ese caso todavía no hay sesión).
 */
export async function login(credentials) {
  const { data } = await authClient.post('/auth/login', credentials);
  if (data.data.requires2fa) return data.data;
  setAccessToken(data.data.token);
  return data.data.user;
}

/** Paso 2: código de 6 dígitos de la app autenticadora, o un código de respaldo. */
export async function loginWithCode({ challengeToken, code }) {
  const { data } = await authClient.post('/auth/login/2fa', { challengeToken, code });
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

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data.data;
}

/** -> { secret, otpauthUrl, qr } */
export async function startTwoFactorSetup(password) {
  const { data } = await api.post('/auth/2fa/setup', { password });
  return data.data;
}

/** -> { backupCodes: string[] } (solo se muestran esta vez) */
export async function enableTwoFactor(code) {
  const { data } = await api.post('/auth/2fa/enable', { code });
  return data.data;
}

export async function disableTwoFactor({ password, code }) {
  await api.post('/auth/2fa/disable', { password, code });
}
