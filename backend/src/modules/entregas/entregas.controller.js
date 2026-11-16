import * as service from './entregas.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const resumen = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.resumen(req.query) });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.list(req.query) });
});
