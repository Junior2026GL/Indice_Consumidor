import { db } from '../../infrastructure/database/mysql.js';

/** Condiciones comunes: usuario, rango de fechas (inclusive) y DNI que empieza con lo escrito. */
function buildWhere({ usuarioId, desde, hasta, q }) {
  const where = [];
  const params = [];

  if (usuarioId) {
    where.push('e.usuario_id = ?');
    params.push(usuarioId);
  }
  if (desde) {
    where.push('e.entregado_at >= ?');
    params.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    where.push('e.entregado_at <= ?');
    params.push(`${hasta} 23:59:59`);
  }
  if (q) {
    where.push('e.identificador LIKE ?');
    params.push(`${q}%`); // solo dígitos (validado): no hay comodines que escapar
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/** Entregas por usuario (con la primera y la última), dentro del rango pedido. */
export async function resumenPorUsuario({ desde, hasta }) {
  const { whereSql, params } = buildWhere({ desde, hasta });
  const [rows] = await db.query(
    `SELECT e.usuario_id, u.nombre, u.usuario,
            COUNT(*) AS total,
            MIN(e.entregado_at) AS primera,
            MAX(e.entregado_at) AS ultima
     FROM entregas e
     LEFT JOIN usuarios u ON u.id = e.usuario_id
     ${whereSql}
     GROUP BY e.usuario_id, u.nombre, u.usuario
     ORDER BY total DESC, u.nombre
     LIMIT 200`,
    params
  );
  return rows;
}

/** Detalle: una fila por entrega, con el beneficiario y quién la registró. */
export async function listEntregas({ usuarioId, desde, hasta, q, page, pageSize }) {
  const { whereSql, params } = buildWhere({ usuarioId, desde, hasta, q });

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM entregas e ${whereSql}`, params);

  const [rows] = await db.query(
    `SELECT e.id, e.identificador, e.usuario_id, u.nombre AS usuario_nombre, e.entregado_at,
            (SELECT b.num FROM beneficiarios b WHERE b.identificador = e.identificador LIMIT 1) AS num,
            (SELECT b.grupo FROM beneficiarios b WHERE b.identificador = e.identificador LIMIT 1) AS grupo
     FROM entregas e
     LEFT JOIN usuarios u ON u.id = e.usuario_id
     ${whereSql}
     ORDER BY e.entregado_at DESC, e.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return { items: rows, total: Number(total) };
}

export async function countEntregas() {
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM entregas');
  return Number(total);
}

/**
 * Deja la tabla vacía. TRUNCATE es lo más rápido y reinicia el contador de ids, pero exige el permiso
 * DROP; si el usuario de la base no lo tiene se usa DELETE, que logra el mismo resultado.
 */
export async function vaciarEntregas() {
  try {
    await db.query('TRUNCATE TABLE entregas');
  } catch (error) {
    if (error.code !== 'ER_TABLEACCESS_DENIED_ERROR') throw error;
    await db.query('DELETE FROM entregas');
  }
}
