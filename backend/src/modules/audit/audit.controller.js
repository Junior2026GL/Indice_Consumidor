import * as service from './audit.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const stats = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.stats(req.query) });
});

export const list = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: await service.list(req.query) });
});
