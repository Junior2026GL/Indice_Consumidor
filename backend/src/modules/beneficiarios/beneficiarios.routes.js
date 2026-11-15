import { Router } from 'express';
import * as controller from './beneficiarios.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { searchLimiter } from '../../shared/middleware/rateLimit.js';
import { ROLES } from '../../shared/constants/roles.js';
import { buscarQuery, dniParams, entregaSchema } from './beneficiarios.schemas.js';

const router = Router();

// Todo requiere sesión (authRequired en routes/index.js). Cualquier rol activo puede consultar
// y marcar entregas; solo el Super Admin puede anular una entrega registrada por error.
router.get('/buscar', searchLimiter, validate({ query: buscarQuery }), controller.buscar);
router.post('/entrega', searchLimiter, validate({ body: entregaSchema }), controller.entregar);
router.delete(
  '/entrega/:dni',
  requireRole(ROLES.SUPER_ADMIN),
  validate({ params: dniParams }),
  controller.anularEntrega
);

export default router;
