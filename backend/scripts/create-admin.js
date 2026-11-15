/**
 * Crea (o restablece) el Super Admin inicial.
 *
 *   ADMIN_PASSWORD='ContraseñaSegura123' npm run create-admin -- superadmin "Super Administrador"
 *
 * La contraseña se lee de la variable ADMIN_PASSWORD (no como argumento) para que
 * no quede en el historial de la shell ni en la lista de procesos.
 */
import bcrypt from 'bcryptjs';
import { db } from '../src/infrastructure/database/mysql.js';
import { passwordSchema } from '../src/shared/validation/common.js';

const [usuario = 'superadmin', nombre = 'Super Administrador'] = process.argv.slice(2);
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Define la variable ADMIN_PASSWORD con la contraseña inicial.');
  process.exit(1);
}

const check = passwordSchema.safeParse(password);
if (!check.success) {
  console.error(check.error.issues[0].message);
  process.exit(1);
}

try {
  const [[role]] = await db.query("SELECT id FROM roles WHERE nombre = 'SUPER_ADMIN' LIMIT 1");
  if (!role) throw new Error('No existe el rol SUPER_ADMIN. Ejecuta antes: npm run db:seed');

  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO usuarios (rol_id, nombre, usuario, password_hash, activo)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol_id = VALUES(rol_id),
       activo = 1, intentos_fallidos = 0, bloqueado_hasta = NULL`,
    [role.id, nombre, usuario, hash]
  );
  console.log(`Super Admin "${usuario}" listo.`);
} catch (error) {
  console.error('Error:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
