import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import routes from './routes/index.js';
import { globalLimiter } from './shared/middleware/rateLimit.js';
import { errorHandler, notFound } from './shared/middleware/error.middleware.js';

export const app = express();

app.disable('x-powered-by');
// Query strings planas (querystring de Node): la API no usa objetos anidados y así
// se evita el parser `qs`, que acumula avisos de seguridad.
app.set('query parser', 'simple');
// Solo se confía en X-Forwarded-For si TRUST_PROXY lo indica (ver README).
app.set('trust proxy', env.trustProxy);

const SAFE_REQUEST_ID = /^[\w-]{8,64}$/;

app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: { ignore: (req) => req.url.startsWith('/api/health') },
  })
);

// Es una API JSON: nada debe ejecutarse ni incrustarse desde sus respuestas.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: env.isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      // Sin cabecera Origin (curl, health checks, mismo origen) no aplica CORS.
      if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Origen no permitido por CORS'));
    },
    credentials: true,
    maxAge: 600,
  })
);

app.use(compression());
app.use(globalLimiter);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Las respuestas contienen datos de sesión y de usuarios: que nada las cachee.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);
