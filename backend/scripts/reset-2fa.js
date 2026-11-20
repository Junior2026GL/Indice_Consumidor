/**
 * Quita la verificación en dos pasos de un usuario (por ejemplo, si perdió el celular y
 * también sus códigos de respaldo). Requiere acceso al servidor, así que solo puede
 * hacerlo quien administra la infraestructura.
 *
 *   npm run reset-2fa -- superadmin
 */
import { db } from '../src/infrastructure/database/mysql.js';

const [usuario] = process.argv.slice(2);

if (!usuario) {
  console.error('Indica el usuario: npm run reset-2fa -- <usuario>');
  process.exit(1);
}

try {
  const [[user]] = await db.query('SELECT id FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
  if (!user) throw new Error(`No existe el usuario "${usuario}".`);

  await db.query(
    'UPDATE usuarios SET totp_enabled = 0, totp_secret = NULL, totp_last_step = NULL WHERE id = ?',
    [user.id]
  );
  await db.query('DELETE FROM usuario_backup_codes WHERE usuario_id = ?', [user.id]);
  await db.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE usuario_id = ? AND revoked_at IS NULL', [
    user.id,
  ]);
  await db.query(
    "INSERT INTO auditoria (usuario_id, accion, modulo, descripcion) VALUES (?, 'DESACTIVAR_2FA', 'AUTENTICACION', ?)",
    [user.id, 'Verificación en dos pasos restablecida desde el servidor (reset-2fa)']
  );
  console.log(`Verificación en dos pasos desactivada para "${usuario}". Sus sesiones se cerraron.`);
} catch (error) {
  console.error('Error:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
