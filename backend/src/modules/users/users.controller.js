import * as service from './users.service.js';
import { record as recordAudit } from '../audit/audit.service.js';
import { AUDIT_ACCIONES, AUDIT_MODULOS } from '../../shared/constants/auditoria.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const audit = (req, accion, descripcion) =>
  recordAudit(req, { accion, modulo: AUDIT_MODULOS.USUARIOS, descripcion });

export const list = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.list(req.query) });
});

export const roles = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.roles() });
});

export const getById = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.getById(req.params.id) });
});

export const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body);
  await audit(req, AUDIT_ACCIONES.CREAR, `Usuario creado: ${data.usuario} (${data.rol})`);
  res.status(201).json({ ok: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.id, req.body, req.user.sub);
  await audit(req, AUDIT_ACCIONES.ACTUALIZAR, `Usuario actualizado: ${data.usuario}`);
  res.json({ ok: true, data });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await service.resetPassword(req.params.id, req.body.password);
  await audit(
    req,
    AUDIT_ACCIONES.RESET_PASSWORD,
    `Contraseña restablecida para el usuario #${req.params.id} (sesiones cerradas)`
  );
  res.json({ ok: true, data });
});

export const setActive = asyncHandler(async (req, res) => {
  const data = await service.setActive(req.params.id, req.body.activo, req.user.sub);
  await audit(
    req,
    data.activo ? AUDIT_ACCIONES.ACTIVAR : AUDIT_ACCIONES.DESACTIVAR,
    `Usuario ${data.activo ? 'activado' : 'desactivado'}: ${data.usuario}`
  );
  res.json({ ok: true, data });
});
