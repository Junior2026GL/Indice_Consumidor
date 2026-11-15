import mysql from 'mysql2/promise';
import { env } from '../../config/env.js';

export const db = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: env.db.poolSize,
  queueLimit: 0,
  connectTimeout: 10_000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  charset: 'utf8mb4',
  dateStrings: true,
  // Defensa en profundidad contra inyección SQL: una sola sentencia por consulta.
  multipleStatements: false,
});

// Todas las conexiones trabajan en hora de Honduras (UTC-6, sin horario de verano),
// para que NOW() y CURRENT_TIMESTAMP usen la hora local sin importar la zona del servidor.
db.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '-06:00'");
});

/**
 * Ejecuta `work(connection)` dentro de una transacción. Hace commit si termina
 * bien y rollback si lanza. Usar para operaciones que tocan varias tablas.
 */
export async function withTransaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function pingDatabase() {
  await db.query('SELECT 1');
}
