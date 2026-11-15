import { db } from '../../infrastructure/database/mysql.js';

export async function findUserByUsername(usuario) {
  const [rows] = await db.query(
    `SELECT u.id, u.nombre, u.usuario, u.password_hash, u.activo, r.nombre AS rol,
            (u.bloqueado_hasta IS NOT NULL AND u.bloqueado_hasta > NOW()) AS bloqueado,
            GREATEST(1, CEIL(TIMESTAMPDIFF(SECOND, NOW(), u.bloqueado_hasta) / 60)) AS minutos_bloqueo
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     WHERE u.usuario = ?
     LIMIT 1`,
    [usuario]
  );
  return rows[0] || null;
}

/** Usuario activo con su rol vigente. Lo usa el middleware de autenticación en cada request. */
export async function findActiveUserById(id) {
  const [rows] = await db.query(
    `SELECT u.id, u.nombre, u.usuario, r.nombre AS rol
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     WHERE u.id = ? AND u.activo = 1
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await db.query(
    `SELECT u.id, u.nombre, u.usuario, u.email, u.activo, r.nombre AS rol
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Suma un intento fallido de forma atómica y bloquea la cuenta al llegar al máximo.
 * El orden de las asignaciones importa: MySQL las evalúa de izquierda a derecha.
 */
export async function registerFailedLogin(id, { maxAttempts, lockMinutes }) {
  await db.query(
    `UPDATE usuarios
     SET bloqueado_hasta = IF(intentos_fallidos + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), bloqueado_hasta),
         intentos_fallidos = IF(intentos_fallidos + 1 >= ?, 0, intentos_fallidos + 1)
     WHERE id = ?`,
    [maxAttempts, lockMinutes, maxAttempts, id]
  );
}

export async function registerSuccessfulLogin(id) {
  await db.query(
    `UPDATE usuarios
     SET ultimo_acceso_at = NOW(), intentos_fallidos = 0, bloqueado_hasta = NULL
     WHERE id = ?`,
    [id]
  );
}

export async function findPasswordHashById(id) {
  const [rows] = await db.query('SELECT id, password_hash FROM usuarios WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function updatePasswordById(id, passwordHash) {
  await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

/* ---------------------------- Refresh tokens ---------------------------- */

export async function insertRefreshToken({ userId, familyId, tokenHash, days, ip, userAgent }) {
  await db.query(
    `INSERT INTO refresh_tokens (usuario_id, family_id, token_hash, expires_at, ip, user_agent)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?)`,
    [userId, familyId, tokenHash, days, ip || null, userAgent ? String(userAgent).slice(0, 255) : null]
  );
}

export async function findRefreshTokenByHash(tokenHash) {
  const [rows] = await db.query(
    `SELECT id, usuario_id, family_id,
            (revoked_at IS NOT NULL) AS revoked,
            TIMESTAMPDIFF(SECOND, revoked_at, NOW()) AS revoked_seconds_ago,
            (expires_at <= NOW()) AS expired
     FROM refresh_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

/** Revoca un token. Devuelve true solo si este llamado fue quien lo revocó (evita carreras). */
export async function revokeRefreshToken(id) {
  const [result] = await db.query(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL',
    [id]
  );
  return result.affectedRows === 1;
}

export async function revokeFamily(familyId) {
  await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL', [
    familyId,
  ]);
}

export async function revokeAllForUser(userId) {
  await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE usuario_id = ? AND revoked_at IS NULL', [
    userId,
  ]);
}

export async function purgeExpiredRefreshTokens() {
  const [result] = await db.query(
    'DELETE FROM refresh_tokens WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY)'
  );
  return result.affectedRows;
}
