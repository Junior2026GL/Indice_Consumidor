import { db } from '../../infrastructure/database/mysql.js';
import { escapeLike } from '../../shared/utils/sql.js';

const USER_COLUMNS = `u.id, u.nombre, u.usuario, u.email, u.telefono, u.activo, u.rol_id, r.nombre AS rol,
            u.ultimo_acceso_at, u.created_at`;

export async function listUsers({ q, rol, page, pageSize }) {
  const where = [];
  const params = [];

  if (rol) {
    where.push('r.nombre = ?');
    params.push(rol);
  }
  if (q) {
    where.push('(u.nombre LIKE ? OR u.usuario LIKE ? OR u.email LIKE ?)');
    const like = `%${escapeLike(q)}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id
     ${whereSql}`,
    params
  );

  const [items] = await db.query(
    `SELECT ${USER_COLUMNS}
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     ${whereSql}
     ORDER BY u.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return { items, total: Number(total) };
}

export async function getUserStats() {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(u.activo = 1), 0) AS activos,
            COALESCE(SUM(u.activo = 0), 0) AS inactivos,
            COALESCE(SUM(r.nombre IN ('SUPER_ADMIN', 'ADMIN')), 0) AS administradores
     FROM usuarios u LEFT JOIN roles r ON r.id = u.rol_id`
  );
  return {
    total: Number(row.total),
    activos: Number(row.activos),
    inactivos: Number(row.inactivos),
    administradores: Number(row.administradores),
  };
}

export async function findUserById(id) {
  const [rows] = await db.query(
    `SELECT ${USER_COLUMNS}
     FROM usuarios u
     LEFT JOIN roles r ON r.id = u.rol_id
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function findUsernameOwner(usuario) {
  const [rows] = await db.query('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
  return rows[0] || null;
}

/** Cantidad de Super Admins activos, sin contar a `excludeId`. */
export async function countOtherActiveSuperAdmins(excludeId) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE r.nombre = 'SUPER_ADMIN' AND u.activo = 1 AND u.id <> ?`,
    [excludeId]
  );
  return Number(row.total);
}

export async function listRoles() {
  const [rows] = await db.query('SELECT id, nombre, descripcion FROM roles ORDER BY id');
  return rows;
}

export async function createUser({ nombre, usuario, email, telefono, passwordHash, rolId }) {
  const [result] = await db.query(
    `INSERT INTO usuarios (nombre, usuario, email, telefono, password_hash, rol_id, activo)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [nombre, usuario, email, telefono, passwordHash, rolId]
  );
  return result.insertId;
}

export async function updateUser(id, { nombre, usuario, email, telefono, rolId }) {
  await db.query(
    'UPDATE usuarios SET nombre = ?, usuario = ?, email = ?, telefono = ?, rol_id = ? WHERE id = ?',
    [nombre, usuario, email, telefono, rolId, id]
  );
}

/** Cambia la contraseña y limpia cualquier bloqueo por intentos fallidos. */
export async function updatePassword(id, passwordHash) {
  await db.query(
    'UPDATE usuarios SET password_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?',
    [passwordHash, id]
  );
}

export async function setActive(id, activo) {
  await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}
