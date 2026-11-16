import { Router } from 'express';
import * as controller from './beneficiarios.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { searchLimiter } from '../../shared/middleware/rateLimit.js';
import { buscarQuery, dniParams, entregaSchema } from './beneficiarios.schemas.js';

const router = Router();

// Todo requiere sesión (authRequired en routes/index.js). Cualquier rol activo puede consultar
// y marcar entregas, y anular las que ellos registraron; el Super Admin puede anular cualquiera
// (la regla vive en el servicio).
router.get('/buscar', searchLimiter, validate({ query: buscarQuery }), controller.buscar);
router.post('/entrega', searchLimiter, validate({ body: entregaSchema }), controller.entregar);
router.delete('/entrega/:dni', validate({ params: dniParams }), controller.anularEntrega);

export default router;
