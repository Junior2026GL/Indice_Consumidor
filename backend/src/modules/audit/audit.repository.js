import { db } from '../../infrastructure/database/mysql.js';
import { escapeLike } from '../../shared/utils/sql.js';

export async function logAudit({ userId, accion, modulo, descripcion, ip }) {
  await db.query(
    `INSERT INTO auditoria (usuario_id, accion, modulo, descripcion, ip)
     VALUES (?, ?, ?, ?, ?)`,
    [userId || null, accion, modulo, descripcion ? String(descripcion).slice(0, 1000) : null, ip || null]
  );
}

// Acciones que merecen revisión: intentos fallidos de acceso y cuentas desactivadas.
export const ACCIONES_ALERTA = [
  'LOGIN_FALLIDO',
  'ANULAR_ENTREGA',
  'VACIAR_ENTREGAS',
  'DESACTIVAR',
  'DESACTIVAR_2FA',
];
const alertasPlaceholders = ACCIONES_ALERTA.map(() => '?').join(', ');

/**
 * Cifras para las tarjetas de resumen. Las fechas llegan desde el navegador
 * (día local del usuario) para que "hoy" no dependa de la zona horaria del servidor.
 */
export async function getAuditStats({ hoy, desdeSemana }) {
  const [[row]] = await db.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(created_at >= ?), 0) AS hoy,
       COALESCE(SUM(created_at >= ? AND accion IN (${alertasPlaceholders})), 0) AS alertas
     FROM auditoria`,
    [`${hoy} 00:00:00`, `${desdeSemana} 00:00:00`, ...ACCIONES_ALERTA]
  );

  return { total: Number(row.total), hoy: Number(row.hoy), alertas: Number(row.alertas) };
}

export async function listAudit({ modulo, accion, soloAlertas, usuarioId, desde, hasta, q, page, pageSize }) {
  const where = [];
  const params = [];

  if (modulo) {
    where.push('a.modulo = ?');
    params.push(modulo);
  }
  if (accion) {
    where.push('a.accion = ?');
    params.push(accion);
  }
  if (soloAlertas) {
    where.push(`a.accion IN (${alertasPlaceholders})`);
    params.push(...ACCIONES_ALERTA);
  }
  if (usuarioId) {
    where.push('a.usuario_id = ?');
    params.push(usuarioId);
  }
  if (desde) {
    where.push('a.created_at >= ?');
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    where.push('a.created_at <= ?');
    params.push(`${hasta} 23:59:59`);
  }
  if (q) {
    where.push('(a.descripcion LIKE ? OR u.nombre LIKE ? OR a.ip LIKE ?)');
    const like = `%${escapeLike(q)}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${whereSql}`,
    params
  );

  const [rows] = await db.query(
    `SELECT a.id, a.usuario_id, u.nombre AS usuario_nombre, a.accion, a.modulo,
            a.descripcion, a.ip, a.created_at
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${whereSql}
     ORDER BY a.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return { items: rows, total: Number(total) };
}
