import { Router } from 'express';
import * as controller from './users.controller.js';
import { requireRole } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { sensitiveLimiter } from '../../shared/middleware/rateLimit.js';
import { ROLES } from '../../shared/constants/roles.js';
import { idParams } from '../../shared/validation/common.js';
import {
  createUserSchema,
  listUsersQuery,
  resetPasswordSchema,
  setActiveSchema,
  updateUserSchema,
} from './users.schemas.js';

const router = Router();

router.use(requireRole(ROLES.SUPER_ADMIN));

router.get('/', validate({ query: listUsersQuery }), controller.list);
router.get('/roles', controller.roles);
router.get('/:id', validate({ params: idParams }), controller.getById);
router.post('/', validate({ body: createUserSchema }), controller.create);
router.put('/:id', validate({ params: idParams, body: updateUserSchema }), controller.update);
router.patch('/:id/estado', validate({ params: idParams, body: setActiveSchema }), controller.setActive);
router.patch(
  '/:id/password',
  sensitiveLimiter,
  validate({ params: idParams, body: resetPasswordSchema }),
  controller.resetPassword
);

export default router;
