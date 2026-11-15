import { z } from 'zod';
import { passwordSchema } from '../../shared/validation/common.js';

export const loginSchema = z.object({
  usuario: z
    .string({ required_error: 'El usuario es obligatorio' })
    .trim()
    .min(1, 'El usuario es obligatorio')
    .max(60, 'Usuario o contraseña incorrectos'),
  // El límite evita que alguien envíe megabytes para forzar trabajo inútil de bcrypt.
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña es obligatoria')
    .max(200, 'Usuario o contraseña incorrectos'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: 'La contraseña actual es obligatoria' }).min(1).max(200),
  newPassword: passwordSchema,
});
