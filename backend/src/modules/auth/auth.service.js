import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../shared/middleware/auth.middleware.js';
import { AppError, badRequest, conflict, notFoundError, unauthorized } from '../../shared/errors/AppError.js';
import {
  decryptSecret,
  encryptSecret,
  generateBackupCodes,
  generateToken,
  hashBackupCode,
  hashToken,
  newFamilyId,
} from '../../shared/utils/crypto.js';
import { generateSecret, otpauthUrl, verifyTotp } from '../../shared/utils/totp.js';
import * as repository from './auth.repository.js';

const BCRYPT_COST = 12;
const INVALID_CREDENTIALS = 'Usuario o contraseña incorrectos';
// Dos pestañas pueden renovar a la vez; dentro de esta ventana no se considera robo de token.
const REFRESH_REUSE_GRACE_SECONDS = 10;

// Hash falso para igualar el tiempo de respuesta cuando el usuario no existe
// (evita enumerar usuarios midiendo cuánto tarda el login).
const DUMMY_HASH = bcrypt.hashSync('contrasena-falsa-para-igualar-tiempos', BCRYPT_COST);

function publicUser(user) {
  return {
    id: user.id,
    nombre: user.nombre,
    usuario: user.usuario,
    rol: user.rol,
    two_factor: Boolean(user.totp_enabled),
  };
}

const TWO_FACTOR_ISSUER = 'IPC INSEP';
const CHALLENGE_AUDIENCE = 'ipc-insep-2fa';
const CHALLENGE_SECONDS = 300;
const INVALID_CODE = 'Código de verificación incorrecto';

// Entre el paso 1 (contraseña) y el paso 2 (código) el cliente solo lleva este token corto.
// Tiene otra audiencia, así que NO sirve como token de acceso a la API.
function signChallenge(userId) {
  return jwt.sign({ purpose: '2fa' }, env.auth.jwtSecret, {
    algorithm: 'HS256',
    subject: String(userId),
    issuer: env.auth.jwtIssuer,
    audience: CHALLENGE_AUDIENCE,
    expiresIn: CHALLENGE_SECONDS,
  });
}

function readChallenge(token) {
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret, {
      algorithms: ['HS256'],
      issuer: env.auth.jwtIssuer,
      audience: CHALLENGE_AUDIENCE,
    });
    if (payload.purpose !== '2fa') throw new Error('purpose');
    return Number(payload.sub);
  } catch {
    throw unauthorized('La verificación expiró. Inicia sesión de nuevo.');
  }
}

/**
 * Acepta un código TOTP de 6 dígitos o un código de respaldo. Cada código sirve una sola vez.
 * Devuelve 'totp' | 'backup' si es válido, o null.
 */
async function checkSecondFactor(state, code) {
  const input = String(code).trim();
  if (/^\d{6}$/.test(input)) {
    if (!state.totp_secret) return null;
    const step = verifyTotp(decryptSecret(state.totp_secret, env.auth.totpEncryptionKey), input);
    if (step === null || Number(state.totp_last_step) >= step) return null;
    return (await repository.claimTotpStep(state.id, step)) ? 'totp' : null;
  }
  return (await repository.consumeBackupCode(state.id, hashBackupCode(input))) ? 'backup' : null;
}

async function startSession(user, familyId, ctx) {
  const refreshToken = generateToken();
  await repository.insertRefreshToken({
    userId: user.id,
    familyId,
    tokenHash: hashToken(refreshToken),
    days: env.auth.refreshTokenDays,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });
  return { accessToken: signAccessToken(user), refreshToken, user: publicUser(user) };
}

export async function login({ usuario, password }, ctx) {
  const user = await repository.findUserByUsername(usuario);

  if (user?.bloqueado) {
    throw new AppError(
      `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${user.minutos_bloqueo} minuto(s).`,
      429
    );
  }

  const valid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

  if (!user || !user.activo || !valid) {
    if (user && user.activo) {
      await repository.registerFailedLogin(user.id, {
        maxAttempts: env.auth.loginMaxAttempts,
        lockMinutes: env.auth.loginLockMinutes,
      });
    }
    throw unauthorized(INVALID_CREDENTIALS);
  }

  // Con 2FA activo todavía no hay sesión: se pide el código en un segundo paso.
  if (user.totp_enabled) {
    return { requires2fa: true, challengeToken: signChallenge(user.id) };
  }

  await repository.registerSuccessfulLogin(user.id);
  return startSession(user, newFamilyId(), ctx);
}

/** Paso 2 del login con 2FA. Un código incorrecto cuenta como intento fallido (bloquea la cuenta igual que una contraseña errónea). */
export async function loginWithSecondFactor({ challengeToken, code }, ctx) {
  const userId = readChallenge(challengeToken);
  const state = await repository.findTwoFactorState(userId);
  if (!state || !state.totp_enabled) throw unauthorized('La verificación expiró. Inicia sesión de nuevo.');

  const fail = (error) => Object.assign(error, { usuario: state.usuario });

  if (state.bloqueado) {
    throw fail(
      new AppError(
        `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${state.minutos_bloqueo} minuto(s).`,
        429
      )
    );
  }

  const method = await checkSecondFactor(state, code);
  if (!method) {
    await repository.registerFailedLogin(state.id, {
      maxAttempts: env.auth.loginMaxAttempts,
      lockMinutes: env.auth.loginLockMinutes,
    });
    throw fail(unauthorized(INVALID_CODE));
  }

  await repository.registerSuccessfulLogin(state.id);
  const user = await repository.findActiveUserById(state.id);
  return { ...(await startSession(user, newFamilyId(), ctx)), method };
}

/* ------------------- Configuración de la verificación en dos pasos ------------------- */

async function requirePassword(userId, password) {
  const row = await repository.findPasswordHashById(userId);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw badRequest('La contraseña no es correcta');
  }
}

/** Paso 1: genera un secreto nuevo (aún sin activar) y su código QR. Exige la contraseña. */
export async function startTwoFactorSetup(userId, { password }) {
  await requirePassword(userId, password);
  const state = await repository.findTwoFactorState(userId);
  if (!state) throw notFoundError('Usuario no encontrado');
  if (state.totp_enabled) throw conflict('La verificación en dos pasos ya está activa');

  const secret = generateSecret();
  await repository.savePendingTotpSecret(userId, encryptSecret(secret, env.auth.totpEncryptionKey));

  const url = otpauthUrl({ secret, account: state.usuario, issuer: TWO_FACTOR_ISSUER });
  return { secret, otpauthUrl: url, qr: await QRCode.toDataURL(url, { margin: 1, width: 240 }) };
}

/** Paso 2: confirma con un código real, activa el 2FA y entrega los códigos de respaldo (única vez que se ven). */
export async function enableTwoFactor(userId, { code }) {
  const state = await repository.findTwoFactorState(userId);
  if (!state?.totp_secret)
    throw badRequest('Primero inicia la configuración de la verificación en dos pasos');
  if (state.totp_enabled) throw conflict('La verificación en dos pasos ya está activa');

  const step = verifyTotp(decryptSecret(state.totp_secret, env.auth.totpEncryptionKey), String(code).trim());
  if (step === null || !(await repository.claimTotpStep(userId, step))) throw badRequest(INVALID_CODE);

  const backupCodes = generateBackupCodes();
  await repository.enableTotp(userId, backupCodes.map(hashBackupCode));
  return { backupCodes };
}

/** Desactivar exige contraseña Y un código vigente (o de respaldo). */
export async function disableTwoFactor(userId, { password, code }) {
  await requirePassword(userId, password);
  const state = await repository.findTwoFactorState(userId);
  if (!state?.totp_enabled) throw badRequest('La verificación en dos pasos no está activa');
  if (!(await checkSecondFactor(state, code))) throw badRequest(INVALID_CODE);
  await repository.disableTotp(userId);
}

/**
 * Renueva la sesión con rotación: cada refresh token sirve una sola vez. Si llega uno
 * que ya fue usado, se asume robo y se revoca toda la familia de sesiones.
 */
export async function refresh(rawToken, ctx) {
  if (!rawToken) throw unauthorized('Sesión expirada');

  const stored = await repository.findRefreshTokenByHash(hashToken(rawToken));
  if (!stored) throw unauthorized('Sesión expirada');

  if (stored.revoked) {
    if (Number(stored.revoked_seconds_ago) > REFRESH_REUSE_GRACE_SECONDS) {
      await repository.revokeFamily(stored.family_id);
    }
    throw unauthorized('Sesión expirada');
  }
  if (stored.expired) throw unauthorized('Sesión expirada');

  const user = await repository.findActiveUserById(stored.usuario_id);
  if (!user) {
    await repository.revokeFamily(stored.family_id);
    throw unauthorized('Sesión expirada');
  }

  // Solo uno de dos refresh simultáneos con el mismo token puede ganar.
  const claimed = await repository.revokeRefreshToken(stored.id);
  if (!claimed) throw unauthorized('Sesión expirada');

  return startSession(user, stored.family_id, ctx);
}

/** Cierra la sesión revocando la familia del token. Devuelve el id del usuario si se reconoce. */
export async function logout(rawToken) {
  if (!rawToken) return null;
  const stored = await repository.findRefreshTokenByHash(hashToken(rawToken));
  if (!stored) return null;
  await repository.revokeFamily(stored.family_id);
  return stored.usuario_id;
}

export async function me(userId) {
  const user = await repository.findUserById(userId);
  if (!user) throw notFoundError('Usuario no encontrado');
  return publicUser(user);
}

export async function changeMyPassword(userId, { currentPassword, newPassword }, ctx) {
  const user = await repository.findPasswordHashById(userId);
  if (!user) throw notFoundError('Usuario no encontrado');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw badRequest('La contraseña actual no es correcta');
  if (currentPassword === newPassword) throw badRequest('La nueva contraseña debe ser distinta a la actual');

  await repository.updatePasswordById(userId, await bcrypt.hash(newPassword, BCRYPT_COST));

  // Cierra todas las demás sesiones y abre una nueva para este dispositivo.
  await repository.revokeAllForUser(userId);
  const current = await repository.findActiveUserById(userId);
  return startSession(current, newFamilyId(), ctx);
}

export function purgeExpiredSessions() {
  return repository.purgeExpiredRefreshTokens();
}
