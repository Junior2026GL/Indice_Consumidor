import { Router } from 'express';
import * as controller from './audit.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { ROLES } from '../../shared/constants/roles.js';
import { listAuditQuery, statsQuery } from './audit.schemas.js';

const router = Router();

router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/resumen', validate({ query: statsQuery }), controller.stats);
router.get('/', validate({ query: listAuditQuery }), controller.list);

export default router;
