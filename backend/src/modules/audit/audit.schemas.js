import { z } from 'zod';
import { booleanLike, dateString, idSchema } from '../../shared/validation/common.js';

const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

export const statsQuery = z.object({
  hoy: emptyToUndefined(dateString),
  desdeSemana: emptyToUndefined(dateString),
});

export const listAuditQuery = z.object({
  modulo: emptyToUndefined(z.string().trim().max(100)),
  accion: emptyToUndefined(z.string().trim().max(100)),
  soloAlertas: emptyToUndefined(booleanLike),
  usuarioId: emptyToUndefined(idSchema),
  desde: emptyToUndefined(dateString),
  hasta: emptyToUndefined(dateString),
  q: emptyToUndefined(z.string().trim().max(100)),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
