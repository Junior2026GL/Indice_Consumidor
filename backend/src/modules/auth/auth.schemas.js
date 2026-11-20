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

const codeField = z
  .string({ required_error: 'El código es obligatorio' })
  .trim()
  .min(6, 'Código incorrecto')
  .max(20, 'Código incorrecto');

export const login2faSchema = z.object({
  challengeToken: z.string({ required_error: 'Sesión de verificación inválida' }).min(1).max(2000),
  code: codeField,
});

export const twoFactorSetupSchema = z.object({
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1).max(200),
});

export const twoFactorEnableSchema = z.object({ code: codeField });

export const twoFactorDisableSchema = z.object({
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1).max(200),
  code: codeField,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ required_error: 'La contraseña actual es obligatoria' }).min(1).max(200),
  newPassword: passwordSchema,
});
