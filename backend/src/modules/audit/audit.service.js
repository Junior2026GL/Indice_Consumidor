import * as repository from './audit.repository.js';
import { logger } from '../../config/logger.js';
import { getClientIp } from '../../shared/utils/clientIp.js';

/**
 * Registra un evento de auditoría a partir del request actual.
 * Nunca lanza: si falla el registro, solo se deja constancia en el log
 * para no interrumpir la acción real que está siendo auditada.
 */
export async function record(req, { accion, modulo, descripcion, userId }) {
  try {
    await repository.logAudit({
      userId: userId ?? req.user?.sub ?? null,
      accion,
      modulo,
      descripcion,
      ip: getClientIp(req),
    });
  } catch (error) {
    (req.log || logger).error({ err: error, accion, modulo }, 'No se pudo registrar auditoría');
  }
}

export function stats(query) {
  const hoy = query.hoy || new Date().toISOString().slice(0, 10);
  const desdeSemana = query.desdeSemana || hoy;
  return repository.getAuditStats({ hoy, desdeSemana });
}

export function list(query) {
  return repository.listAudit(query);
}
