import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { signAccessToken } from '../../shared/middleware/auth.middleware.js';
import { AppError, badRequest, notFoundError, unauthorized } from '../../shared/errors/AppError.js';
import { generateToken, hashToken, newFamilyId } from '../../shared/utils/crypto.js';
import * as repository from './auth.repository.js';

const BCRYPT_COST = 12;
const INVALID_CREDENTIALS = 'Usuario o contraseña incorrectos';
// Dos pestañas pueden renovar a la vez; dentro de esta ventana no se considera robo de token.
const REFRESH_REUSE_GRACE_SECONDS = 10;

// Hash falso para igualar el tiempo de respuesta cuando el usuario no existe
// (evita enumerar usuarios midiendo cuánto tarda el login).
const DUMMY_HASH = bcrypt.hashSync('contrasena-falsa-para-igualar-tiempos', BCRYPT_COST);

function publicUser(user) {
  return { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol };
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

  await repository.registerSuccessfulLogin(user.id);
  return startSession(user, newFamilyId(), ctx);
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
