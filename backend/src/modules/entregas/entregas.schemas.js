import { z } from 'zod';
import { dateString, idSchema } from '../../shared/validation/common.js';

const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

const rango = {
  usuarioId: emptyToUndefined(idSchema),
  desde: emptyToUndefined(dateString),
  hasta: emptyToUndefined(dateString),
};

export const resumenQuery = z.object(rango);

export const listEntregasQuery = z.object({
  ...rango,
  q: emptyToUndefined(
    z
      .string()
      .trim()
      .regex(/^\d{1,13}$/, 'Escribe solo dígitos del DNI')
  ),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Confirmación escrita: sin la palabra exacta no se vacía nada.
export const vaciarBody = z.object({
  confirmacion: z.literal('VACIAR', { errorMap: () => ({ message: 'Escribe VACIAR para confirmar' }) }),
});
