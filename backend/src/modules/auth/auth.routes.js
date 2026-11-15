import { Router } from 'express';
import * as controller from './auth.controller.js';
import { authRequired } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.js';
import { loginLimiter, refreshLimiter, sensitiveLimiter } from '../../shared/middleware/rateLimit.js';
import { forbidden } from '../../shared/errors/AppError.js';
import { changePasswordSchema, loginSchema } from './auth.schemas.js';

const router = Router();

// Los endpoints que se autentican con la cookie exigen una cabecera personalizada.
// Un formulario o <img> de otro sitio no puede enviarla, y las peticiones fetch/XHR
// que sí la envían quedan sujetas a la política CORS (defensa extra frente a CSRF).
function requireAjaxHeader(req, res, next) {
  if (req.get('x-requested-with') !== 'XMLHttpRequest') return next(forbidden('Solicitud no permitida'));
  next();
}

router.post('/login', loginLimiter, validate({ body: loginSchema }), controller.login);
router.post('/refresh', refreshLimiter, requireAjaxHeader, controller.refresh);
router.post('/logout', requireAjaxHeader, controller.logout);

router.get('/me', authRequired, controller.me);
router.put(
  '/password',
  authRequired,
  sensitiveLimiter,
  validate({ body: changePasswordSchema }),
  controller.changePassword
);

export default router;
