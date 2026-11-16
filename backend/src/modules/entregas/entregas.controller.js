import * as service from './entregas.service.js';
import { record as recordAudit } from '../audit/audit.service.js';
import { AUDIT_ACCIONES, AUDIT_MODULOS } from '../../shared/constants/auditoria.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const resumen = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.resumen(req.query) });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.list(req.query) });
});

export const vaciar = asyncHandler(async (req, res) => {
  const data = await service.vaciar();
  await recordAudit(req, {
    accion: AUDIT_ACCIONES.VACIAR_ENTREGAS,
    modulo: AUDIT_MODULOS.BENEFICIARIOS,
    descripcion: `Se vació la tabla de entregas (${data.eliminadas} registro(s) eliminados)`,
  });
  res.json({ ok: true, data });
});
