import { z } from 'zod';

export const idSchema = z.coerce
  .number({ invalid_type_error: 'Identificador inválido' })
  .int('Identificador inválido')
  .positive('Identificador inválido')
  .max(Number.MAX_SAFE_INTEGER, 'Identificador inválido');

export const idParams = z.object({ id: idSchema });

// Fecha en formato AAAA-MM-DD y realmente existente.
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (use AAAA-MM-DD)')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Fecha inválida');

// Acepta true/false reales y también "true"/"false"/"1"/"0" (query strings).
export const booleanLike = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      const v = value.toLowerCase();
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0' || v === '') return false;
    }
    return value;
  },
  z.boolean({ invalid_type_error: 'Valor booleano inválido', required_error: 'Valor requerido' })
);

/**
 * Política de contraseñas: 10-72 caracteres (72 bytes es el límite real de bcrypt;
 * más allá se truncaría en silencio), con mayúscula, minúscula y número.
 */
export const passwordSchema = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(10, 'La contraseña debe tener al menos 10 caracteres')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'La contraseña es demasiado larga (máx. 72 bytes)')
  .refine((v) => /[a-z]/.test(v), 'La contraseña debe incluir una minúscula')
  .refine((v) => /[A-Z]/.test(v), 'La contraseña debe incluir una mayúscula')
  .refine((v) => /\d/.test(v), 'La contraseña debe incluir un número');
