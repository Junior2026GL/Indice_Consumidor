import net from 'node:net';

/**
 * IP del cliente. Se apoya en `req.ip`, que Express calcula respetando la
 * configuración `trust proxy` (TRUST_PROXY). No se leen cabeceras como
 * X-Forwarded-For directamente porque cualquier cliente puede falsificarlas
 * y así evadir el rate limit o ensuciar la bitácora de auditoría.
 */
export function normalizeIp(valor) {
  if (!valor) return null;
  let ip = String(valor).trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7); // IPv4 mapeada en IPv6
  return net.isIP(ip) ? ip : null;
}

export function getClientIp(req) {
  return normalizeIp(req.ip) || normalizeIp(req.socket?.remoteAddress);
}
