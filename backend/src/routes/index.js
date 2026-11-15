import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import beneficiariosRoutes from '../modules/beneficiarios/beneficiarios.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import { authRequired } from '../shared/middleware/auth.middleware.js';
import { pingDatabase } from '../infrastructure/database/mysql.js';
import { asyncHandler } from '../shared/utils/asyncHandler.js';

const router = Router();

// Liveness: el proceso responde.
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'IPC INSEP API' });
});

// Readiness: el proceso responde Y puede hablar con la base de datos.
router.get(
  '/health/ready',
  asyncHandler(async (req, res) => {
    try {
      await pingDatabase();
      res.json({ ok: true, database: 'up' });
    } catch {
      res.status(503).json({ ok: false, database: 'down' });
    }
  })
);

router.use('/auth', authRoutes);

// Todo lo que sigue exige sesión válida.
router.use(authRequired);
router.use('/beneficiarios', beneficiariosRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/auditoria', auditRoutes);

export default router;
