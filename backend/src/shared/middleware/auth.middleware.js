import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { findActiveUserById } from '../../modules/auth/auth.repository.js';
import { forbidden, unauthorized } from '../errors/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export function signAccessToken(user) {
  return jwt.sign({ usuario: user.usuario }, env.auth.jwtSecret, {
    algorithm: 'HS256',
    subject: String(user.id),
    issuer: env.auth.jwtIssuer,
    audience: env.auth.jwtAudience,
    expiresIn: env.auth.accessTokenSeconds,
  });
}

/**
 * Exige un token de acceso válido y, además, consulta la BD: así un usuario
 * desactivado o con rol modificado pierde el acceso de inmediato, sin esperar
 * a que venza el token. El rol que se usa siempre es el actual, no el del token.
 */
export const authRequired = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized('Token requerido');

  let payload;
  try {
    payload = jwt.verify(header.slice(7), env.auth.jwtSecret, {
      algorithms: ['HS256'],
      issuer: env.auth.jwtIssuer,
      audience: env.auth.jwtAudience,
    });
  } catch {
    throw unauthorized('Token inválido o vencido');
  }

  const user = await findActiveUserById(payload.sub);
  if (!user) throw unauthorized('Sesión no válida');

  req.user = { sub: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol };
  next();
});

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) return next(forbidden());
    next();
  };
}
