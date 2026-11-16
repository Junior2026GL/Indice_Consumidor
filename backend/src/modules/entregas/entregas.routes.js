import { Router } from 'express';
import * as controller from './entregas.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { listEntregasQuery, resumenQuery } from './entregas.schemas.js';

const router = Router();

router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/resumen', validate({ query: resumenQuery }), controller.resumen);
router.get('/', validate({ query: listEntregasQuery }), controller.list);

export default router;
