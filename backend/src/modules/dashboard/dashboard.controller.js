import * as service from './dashboard.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const beneficiarios = asyncHandler(async (req, res) => {
  const fresh = req.query.fresh === '1';
  res.json({ ok: true, data: await service.beneficiariosResumen({ fresh }) });
});
