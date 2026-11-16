import { Router } from 'express';
import * as controller from './entregas.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { sensitiveLimiter } from '../../shared/middleware/rateLimit.js';
import { listEntregasQuery, resumenQuery, vaciarBody } from './entregas.schemas.js';

const router = Router();

router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/resumen', validate({ query: resumenQuery }), controller.resumen);
router.get('/', validate({ query: listEntregasQuery }), controller.list);

// Acción destructiva: solo Super Admin, con confirmación escrita y límite de frecuencia.
router.delete('/', sensitiveLimiter, validate({ body: vaciarBody }), controller.vaciar);

export default router;
