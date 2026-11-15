import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { db, pingDatabase } from './infrastructure/database/mysql.js';
import { purgeExpiredSessions } from './modules/auth/auth.service.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function start() {
  try {
    await pingDatabase();
    logger.info('MySQL conectado');
  } catch (error) {
    logger.fatal({ err: error }, 'No se pudo conectar a la base de datos');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`IPC INSEP API ejecutándose en puerto ${env.port} (${env.nodeEnv})`);
  });

  // Mantener las conexiones vivas más tiempo que el balanceador evita errores 502 intermitentes.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  // Limpieza periódica de refresh tokens vencidos.
  const purgeTimer = setInterval(() => {
    purgeExpiredSessions().catch((err) => logger.warn({ err }, 'No se pudo limpiar sesiones vencidas'));
  }, PURGE_INTERVAL_MS);
  purgeTimer.unref();

  let closing = false;
  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    logger.info(`${signal} recibido: cerrando de forma ordenada`);

    const force = setTimeout(() => {
      logger.error('Cierre forzado por tiempo de espera');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();

    server.close(async () => {
      await db.end().catch(() => {});
      logger.info('Servidor detenido');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Promesa rechazada sin manejar');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Excepción no capturada: el proceso se reiniciará');
  process.exit(1);
});

start();
