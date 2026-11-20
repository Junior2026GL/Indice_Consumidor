import 'dotenv/config';
import crypto from 'node:crypto';
import { z } from 'zod';

const PLACEHOLDER_SECRETS = ['cambia-esta-clave', 'changeme', 'secret', 'password'];

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // Uno o varios orígenes permitidos para CORS, separados por coma.
  FRONTEND_URL: z.string().min(1).default('http://localhost:5173'),
  // Número de proxies de confianza delante de la API (0 = ninguno). También acepta
  // 'loopback', 'uniquelocal' o una lista de IP/CIDR. Ver README (sección Despliegue).
  TRUST_PROXY: z.string().default('0'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_]+$/, 'DB_NAME solo admite letras, números y _')
    .default('ipc_insep'),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(200).default(10),

  JWT_SECRET: z.string().optional(),
  // Clave para cifrar los secretos de la verificación en dos pasos. Si no se define se usa JWT_SECRET.
  TOTP_ENCRYPTION_KEY: z.string().min(32, 'TOTP_ENCRYPTION_KEY debe tener al menos 32 caracteres').optional(),
  // Duración corta del token de acceso; la sesión se renueva con el refresh token.
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COOKIE_SECURE: booleanString.optional(),
  COOKIE_DOMAIN: z.string().optional(),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const detalle = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Variables de entorno inválidas:\n${detalle}`);
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';

let jwtSecret = raw.JWT_SECRET;

if (jwtSecret) {
  const weak = jwtSecret.length < 32 || PLACEHOLDER_SECRETS.includes(jwtSecret.toLowerCase());
  if (weak && raw.NODE_ENV !== 'test') {
    throw new Error(
      'JWT_SECRET es demasiado débil (mínimo 32 caracteres, sin valores de ejemplo). ' +
        "Genera uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
    );
  }
} else if (isProduction) {
  throw new Error('JWT_SECRET debe estar definido en producción.');
} else {
  // Desarrollo/test: secreto efímero. Las sesiones se invalidan al reiniciar.
  jwtSecret = crypto.randomBytes(48).toString('base64url');
}

const corsOrigins = raw.FRONTEND_URL.split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (isProduction && corsOrigins.some((origin) => origin === '*')) {
  throw new Error('FRONTEND_URL no puede ser "*" en producción.');
}

function parseTrustProxy(value) {
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

const cookieSecure = raw.COOKIE_SECURE ?? isProduction;

if (raw.COOKIE_SAMESITE === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SAMESITE=none requiere COOKIE_SECURE=true.');
}

export const env = Object.freeze({
  nodeEnv: raw.NODE_ENV,
  isProduction,
  isTest: raw.NODE_ENV === 'test',
  port: raw.PORT,
  corsOrigins,
  trustProxy: parseTrustProxy(raw.TRUST_PROXY),
  logLevel: raw.LOG_LEVEL || (raw.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug'),

  db: Object.freeze({
    host: raw.DB_HOST,
    port: raw.DB_PORT,
    user: raw.DB_USER,
    password: raw.DB_PASSWORD,
    database: raw.DB_NAME,
    poolSize: raw.DB_POOL_SIZE,
  }),

  auth: Object.freeze({
    jwtSecret,
    totpEncryptionKey: raw.TOTP_ENCRYPTION_KEY || jwtSecret,
    jwtIssuer: 'ipc-insep-api',
    jwtAudience: 'ipc-insep-web',
    accessTokenSeconds: raw.JWT_EXPIRES_IN_SECONDS,
    refreshTokenDays: raw.REFRESH_TOKEN_DAYS,
    loginMaxAttempts: raw.LOGIN_MAX_ATTEMPTS,
    loginLockMinutes: raw.LOGIN_LOCK_MINUTES,
  }),

  cookies: Object.freeze({
    secure: cookieSecure,
    sameSite: raw.COOKIE_SAMESITE,
    domain: raw.COOKIE_DOMAIN || undefined,
  }),
});
