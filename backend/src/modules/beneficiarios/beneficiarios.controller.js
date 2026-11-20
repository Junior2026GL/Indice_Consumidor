import * as service from './beneficiarios.service.js';
import { record as recordAudit } from '../audit/audit.service.js';
import { AUDIT_ACCIONES, AUDIT_MODULOS } from '../../shared/constants/auditoria.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

// El DNI nunca se guarda completo en la bitácora: solo los últimos 4 dígitos.
const masked = (dni) => `*********${dni.slice(-4)}`;

const audit = (req, accion, descripcion) =>
  recordAudit(req, { accion, modulo: AUDIT_MODULOS.BENEFICIARIOS, descripcion });

export const buscar = asyncHandler(async (req, res) => {
  const data = await service.buscarPorDni(req.query.dni, req.user);

  await audit(
    req,
    AUDIT_ACCIONES.CONSULTAR,
    `Consulta de DNI ${masked(req.query.dni)} (${data.items.length} resultado(s))`
  );

  res.json({ ok: true, data });
});

export const buscarIndemnizacion = asyncHandler(async (req, res) => {
  const data = await service.buscarIndemnizacion(req.query.dni);

  await audit(
    req,
    AUDIT_ACCIONES.CONSULTAR,
    `Consulta de indemnización del DNI ${masked(req.query.dni)} (${data.encontrado ? 'encontrado' : 'sin resultado'})`
  );

  res.json({ ok: true, data });
});

export const entregar = asyncHandler(async (req, res) => {
  const entrega = await service.marcarEntregado(req.body.dni, req.user);
  await audit(req, AUDIT_ACCIONES.ENTREGAR, `Entrega registrada al DNI ${masked(req.body.dni)}`);
  res.status(201).json({ ok: true, data: entrega });
});

export const anularEntrega = asyncHandler(async (req, res) => {
  await service.anularEntrega(req.params.dni, req.user);
  await audit(req, AUDIT_ACCIONES.ANULAR_ENTREGA, `Entrega anulada al DNI ${masked(req.params.dni)}`);
  res.json({ ok: true, data: { ok: true } });
});
