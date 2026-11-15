import { z } from 'zod';
import { ROLE_LIST } from '../../shared/constants/roles.js';
import { normalizePhone } from '../../shared/utils/phone.js';
import { passwordSchema } from '../../shared/validation/common.js';

const usernamePattern = /^[a-zA-Z0-9._-]{3,40}$/;

const nombre = z
  .string({ required_error: 'El nombre es obligatorio' })
  .trim()
  .min(3, 'El nombre es obligatorio')
  .max(150, 'El nombre es demasiado largo');

const usuario = z
  .string({ required_error: 'El usuario es obligatorio' })
  .trim()
  .regex(usernamePattern, 'Usuario inválido (3-40 caracteres: letras, números, puntos, guiones)');

const email = z
  .union([
    z.literal(''),
    z.string().trim().toLowerCase().max(180, 'Correo demasiado largo').email('Correo inválido'),
  ])
  .optional()
  .nullable()
  .transform((value) => value || null);

const telefono = z
  .string()
  .trim()
  .max(30, 'El teléfono no es válido')
  .optional()
  .nullable()
  .transform((value) => (value ? normalizePhone(value) : null))
  .refine((value) => value === null || (value.length >= 8 && value.length <= 15), 'El teléfono no es válido');

const rol = z.enum(ROLE_LIST, { errorMap: () => ({ message: 'Rol inválido' }) });

const baseFields = { nombre, usuario, email, telefono, rol };

export const createUserSchema = z.object({ ...baseFields, password: passwordSchema });

export const updateUserSchema = z.object(baseFields);

export const setActiveSchema = z.object({
  activo: z.boolean({ required_error: 'El estado es obligatorio', invalid_type_error: 'Estado inválido' }),
});

export const resetPasswordSchema = z.object({ password: passwordSchema });

const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

export const listUsersQuery = z.object({
  q: emptyToUndefined(z.string().trim().max(100)),
  rol: emptyToUndefined(rol),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
