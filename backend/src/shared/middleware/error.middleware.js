import { ZodError } from 'zod';
import { logger } from '../../config/logger.js';

export function notFound(req, res) {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
}

// Traduce errores conocidos de librerías a respuestas HTTP seguras.
function normalize(err) {
  if (err.expose === true && err.statusCode) return err;

  if (err instanceof ZodError) {
    return { statusCode: 400, message: err.issues[0]?.message || 'Datos inválidos' };
  }
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'El cuerpo de la solicitud no es un JSON válido' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'La solicitud es demasiado grande' };
  }
  if (err.code === 'ER_DUP_ENTRY') {
    return { statusCode: 409, message: 'Ya existe un registro con esos datos' };
  }
  if (err.message === 'Origen no permitido por CORS') {
    return { statusCode: 403, message: err.message };
  }
  return { statusCode: 500, message: 'Error interno del servidor' };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const { statusCode, message, details } = normalize(err);

  // Los 5xx son fallos nuestros; los 4xx son del cliente y no merecen nivel error.
  const log = req.log || logger;
  if (statusCode >= 500) log.error({ err }, 'Error no controlado');
  else log.debug({ err: { message: err.message, statusCode } }, 'Solicitud rechazada');

  res.status(statusCode).json({
    ok: false,
    message,
    ...(details ? { details } : {}),
    ...(req.id ? { requestId: req.id } : {}),
  });
}
