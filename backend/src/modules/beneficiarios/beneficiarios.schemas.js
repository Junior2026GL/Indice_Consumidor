import { z } from 'zod';

const dni = z
  .string({ required_error: 'El DNI es obligatorio' })
  .trim()
  .regex(/^\d{13}$/, 'El DNI debe tener exactamente 13 dígitos');

export const buscarQuery = z.object({ dni });

// Indemnización: por DNI exacto o por nombre (todas las palabras, mínimo 3 letras en total).
export const indemnizacionQuery = z
  .object({
    dni: dni.optional(),
    nombre: z.string().trim().min(3, 'Escribe al menos 3 letras del nombre').max(100).optional(),
  })
  .refine((q) => Boolean(q.dni) !== Boolean(q.nombre), 'Indica el DNI o el nombre (solo uno)');
export const entregaSchema = z.object({ dni });
export const dniParams = z.object({ dni });
