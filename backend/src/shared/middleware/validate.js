import { AppError } from '../errors/AppError.js';

/**
 * Valida y normaliza body / params / query con esquemas zod. Los datos validados
 * reemplazan a los originales, así los campos desconocidos nunca llegan al servicio.
 *
 *   router.post('/', validate({ body: createSchema }), controller.create)
 */
export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    for (const [key, schema] of [
      ['params', params],
      ['query', query],
      ['body', body],
    ]) {
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        const first = result.error.issues[0];
        return next(
          new AppError(first?.message || 'Datos inválidos', 400, {
            fields: result.error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
          })
        );
      }
      req[key] = result.data;
    }
    next();
  };
}
