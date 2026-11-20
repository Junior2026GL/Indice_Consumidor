import { Router } from 'express';
import * as controller from './auth.controller.js';
import { authRequired, requireRole } from '../../shared/middleware/auth.middleware.js';
import { ROLES } from '../../shared/constants/roles.js';
import { validate } from '../../shared/middleware/validate.js';
import { loginLimiter, refreshLimiter, sensitiveLimiter } from '../../shared/middleware/rateLimit.js';
import { forbidden } from '../../shared/errors/AppError.js';
import {
  changePasswordSchema,
  login2faSchema,
  loginSchema,
  twoFactorDisableSchema,
  twoFactorEnableSchema,
  twoFactorSetupSchema,
} from './auth.schemas.js';

const router = Router();

// Los endpoints que se autentican con la cookie exigen una cabecera personalizada.
// Un formulario o <img> de otro sitio no puede enviarla, y las peticiones fetch/XHR
// que sí la envían quedan sujetas a la política CORS (defensa extra frente a CSRF).
function requireAjaxHeader(req, res, next) {
  if (req.get('x-requested-with') !== 'XMLHttpRequest') return next(forbidden('Solicitud no permitida'));
  next();
}

router.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
router.post('/login/2fa', loginLimiter, validate({ body: login2faSchema }), controller.login2fa);
router.post('/refresh', refreshLimiter, requireAjaxHeader, controller.refresh);
router.post('/logout', requireAjaxHeader, controller.logout);

router.get('/me', authRequired, controller.me);

// Verificación en dos pasos: solo la configura el Super Admin.
const twoFactor = [authRequired, requireRole(ROLES.SUPER_ADMIN), sensitiveLimiter];
router.post('/2fa/setup', ...twoFactor, validate({ body: twoFactorSetupSchema }), controller.twoFactorSetup);
router.post(
  '/2fa/enable',
  ...twoFactor,
  validate({ body: twoFactorEnableSchema }),
  controller.twoFactorEnable
);
router.post(
  '/2fa/disable',
  ...twoFactor,
  validate({ body: twoFactorDisableSchema }),
  controller.twoFactorDisable
);
router.put(
  '/password',
  authRequired,
  sensitiveLimiter,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

export default router;
