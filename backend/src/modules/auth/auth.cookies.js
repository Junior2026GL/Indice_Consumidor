import { env } from '../../config/env.js';

export const REFRESH_COOKIE = 'ipc_refresh';

// La cookie solo viaja hacia /api/auth, nunca hacia el resto de endpoints.
const cookieOptions = {
  httpOnly: true, // inaccesible para JavaScript: un XSS no puede robar la sesión
  secure: env.cookies.secure,
  sameSite: env.cookies.sameSite,
  domain: env.cookies.domain,
  path: '/api/auth',
};

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions,
    maxAge: env.auth.refreshTokenDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
}
