import * as authService from './auth.service.js';
import { record as recordAudit } from '../audit/audit.service.js';
import { AUDIT_ACCIONES, AUDIT_MODULOS } from '../../shared/constants/auditoria.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { getClientIp } from '../../shared/utils/clientIp.js';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from './auth.cookies.js';

const context = (req) => ({ ip: getClientIp(req), userAgent: req.get('user-agent') });

export const login = asyncHandler(async (req, res) => {
  try {
    const session = await authService.login(req.body, context(req));

    // Contraseña correcta pero falta el segundo paso: todavía no hay sesión ni cookie.
    if (session.requires2fa) {
      return res.json({ ok: true, data: { requires2fa: true, challengeToken: session.challengeToken } });
    }

    setRefreshCookie(res, session.refreshToken);

    await recordAudit(req, {
      userId: session.user.id,
      accion: AUDIT_ACCIONES.LOGIN,
      modulo: AUDIT_MODULOS.AUTENTICACION,
      descripcion: `Inicio de sesión (${session.user.usuario})`,
    });
    res.json({ ok: true, data: { token: session.accessToken, user: session.user } });
  } catch (error) {
    if (error.statusCode === 401 || error.statusCode === 429) {
      await recordAudit(req, {
        accion: AUDIT_ACCIONES.LOGIN_FALLIDO,
        modulo: AUDIT_MODULOS.AUTENTICACION,
        descripcion:
          error.statusCode === 429
            ? `Intento sobre cuenta bloqueada (${req.body?.usuario})`
            : `Intento fallido de inicio de sesión (${req.body?.usuario})`,
      });
    }
    throw error;
  }
});

export const login2fa = asyncHandler(async (req, res) => {
  try {
    const session = await authService.loginWithSecondFactor(req.body, context(req));
    setRefreshCookie(res, session.refreshToken);

    await recordAudit(req, {
      userId: session.user.id,
      accion: AUDIT_ACCIONES.LOGIN,
      modulo: AUDIT_MODULOS.AUTENTICACION,
      descripcion: `Inicio de sesión con verificación en dos pasos (${session.user.usuario}${
        session.method === 'backup' ? ', código de respaldo' : ''
      })`,
    });
    res.json({ ok: true, data: { token: session.accessToken, user: session.user } });
  } catch (error) {
    if ((error.statusCode === 401 || error.statusCode === 429) && error.usuario) {
      await recordAudit(req, {
        accion: AUDIT_ACCIONES.LOGIN_FALLIDO,
        modulo: AUDIT_MODULOS.AUTENTICACION,
        descripcion:
          error.statusCode === 429
            ? `Intento sobre cuenta bloqueada (${error.usuario})`
            : `Código de verificación en dos pasos incorrecto (${error.usuario})`,
      });
    }
    throw error;
  }
});

export const refresh = asyncHandler(async (req, res) => {
  try {
    const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE], context(req));
    setRefreshCookie(res, session.refreshToken);
    res.json({ ok: true, data: { token: session.accessToken, user: session.user } });
  } catch (error) {
    clearRefreshCookie(res);
    throw error;
  }
});

export const logout = asyncHandler(async (req, res) => {
  const userId = await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  if (userId) {
    await recordAudit(req, {
      userId,
      accion: AUDIT_ACCIONES.LOGOUT,
      modulo: AUDIT_MODULOS.AUTENTICACION,
      descripcion: 'Cierre de sesión',
    });
  }
  res.json({ ok: true, data: { ok: true } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await authService.me(req.user.sub) });
});

export const twoFactorSetup = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await authService.startTwoFactorSetup(req.user.sub, req.body) });
});

export const twoFactorEnable = asyncHandler(async (req, res) => {
  const data = await authService.enableTwoFactor(req.user.sub, req.body);
  await recordAudit(req, {
    accion: AUDIT_ACCIONES.ACTIVAR_2FA,
    modulo: AUDIT_MODULOS.AUTENTICACION,
    descripcion: 'Verificación en dos pasos activada',
  });
  res.json({ ok: true, data });
});

export const twoFactorDisable = asyncHandler(async (req, res) => {
  await authService.disableTwoFactor(req.user.sub, req.body);
  await recordAudit(req, {
    accion: AUDIT_ACCIONES.DESACTIVAR_2FA,
    modulo: AUDIT_MODULOS.AUTENTICACION,
    descripcion: 'Verificación en dos pasos desactivada',
  });
  res.json({ ok: true, data: { ok: true } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const session = await authService.changeMyPassword(req.user.sub, req.body, context(req));
  setRefreshCookie(res, session.refreshToken);
  await recordAudit(req, {
    accion: AUDIT_ACCIONES.CAMBIO_PASSWORD,
    modulo: AUDIT_MODULOS.AUTENTICACION,
    descripcion: 'Cambio de contraseña propia (otras sesiones cerradas)',
  });
  res.json({ ok: true, data: { ok: true, token: session.accessToken, user: session.user } });
});
