import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';

function limiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (req, res) => res.status(429).json({ ok: false, message }),
  });
}

// Nota: el almacén es en memoria (por instancia). Si despliegas varias réplicas,
// usa un store compartido (por ejemplo rate-limit-redis) para que el límite sea global.
export const globalLimiter = limiter({
  windowMs: 60_000,
  limit: 300,
  message: 'Demasiadas solicitudes. Intenta de nuevo en un momento.',
});

export const loginLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 20,
  message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.',
});

export const refreshLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 120,
  message: 'Demasiadas renovaciones de sesión. Intenta de nuevo más tarde.',
});

// Freno contra el barrido de DNI. Va después de authRequired, así que el límite es por
// usuario (las redes móviles comparten IP entre muchas personas, limitar por IP sería injusto).
export const searchLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  keyGenerator: (req) => `user:${req.user?.sub ?? 'anon'}`,
  handler: (req, res) =>
    res.status(429).json({ ok: false, message: 'Demasiadas consultas seguidas. Espera unos minutos.' }),
});

export const sensitiveLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 30,
  message: 'Demasiados intentos. Intenta de nuevo más tarde.',
});
