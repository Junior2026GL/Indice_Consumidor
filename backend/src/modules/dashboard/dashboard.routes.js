import { Router } from 'express';
import * as controller from './dashboard.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';

const router = Router();

router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/beneficiarios', controller.beneficiarios);

export default router;
