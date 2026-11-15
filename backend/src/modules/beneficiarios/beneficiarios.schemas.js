import { z } from 'zod';

const dni = z
  .string({ required_error: 'El DNI es obligatorio' })
  .trim()
  .regex(/^\d{13}$/, 'El DNI debe tener exactamente 13 dígitos');

export const buscarQuery = z.object({ dni });
export const entregaSchema = z.object({ dni });
export const dniParams = z.object({ dni });
