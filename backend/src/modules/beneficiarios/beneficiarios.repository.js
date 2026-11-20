import { db } from '../../infrastructure/database/mysql.js';

/** Búsqueda exacta por DNI (13 dígitos, sin guiones); usa el índice de `identificador`. */
export async function findByDni(dni) {
  const [rows] = await db.query(
    `SELECT num, grupo, identificador, cuenta_occidente
     FROM beneficiarios
     WHERE identificador = ?
     ORDER BY num
     LIMIT 10`,
    [dni]
  );
  return rows;
}

/** Indemnización por DNI (`identificador` es la clave primaria de esa tabla). */
export async function findIndemnizacionByDni(dni) {
  const [rows] = await db.query(
    `SELECT numero, identificador, nombre, indemnizacion
     FROM indemnizacion_ipc_insep
     WHERE identificador = ?
     LIMIT 1`,
    [dni]
  );
  return rows[0] || null;
}

export async function existsByDni(dni) {
  const [rows] = await db.query('SELECT 1 FROM beneficiarios WHERE identificador = ? LIMIT 1', [dni]);
  return rows.length > 0;
}

/** Entrega registrada para ese DNI (con el nombre de quien la marcó), o null. */
export async function findEntrega(dni) {
  const [rows] = await db.query(
    `SELECT e.entregado_at, e.usuario_id, u.nombre AS entregado_por
     FROM entregas e
     LEFT JOIN usuarios u ON u.id = e.usuario_id
     WHERE e.identificador = ?
     LIMIT 1`,
    [dni]
  );
  return rows[0] || null;
}

/** La clave única de `identificador` hace que un segundo intento falle con ER_DUP_ENTRY. */
export async function insertEntrega(dni, userId) {
  await db.query('INSERT INTO entregas (identificador, usuario_id) VALUES (?, ?)', [dni, userId]);
}

/** Con userId solo borra la entrega que registró ese usuario (en una sola consulta: sin carreras). */
export async function deleteEntrega(dni, userId) {
  const [result] = userId
    ? await db.query('DELETE FROM entregas WHERE identificador = ? AND usuario_id = ?', [dni, userId])
    : await db.query('DELETE FROM entregas WHERE identificador = ?', [dni]);
  return result.affectedRows;
}
