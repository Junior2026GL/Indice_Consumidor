import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.logLevel,
  base: { service: 'ipc-insep-api' },
  // Nunca registrar credenciales ni tokens.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      '*.password',
      '*.currentPassword',
      '*.newPassword',
      'token',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  ...(env.isProduction || env.isTest
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
});
