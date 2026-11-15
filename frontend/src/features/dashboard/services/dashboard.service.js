import { api } from '../../../services/api.js';

/**
 * { total, unicos, conCuenta, sinCuenta, entregados, pendientes,
 *   porGrupo: [{ grupo, total }], actualizado }
 * `fresh` pide cifras recién calculadas (el servidor las guarda 60 s).
 */
export async function getBeneficiariosResumen({ signal, fresh = false } = {}) {
  const { data } = await api.get('/dashboard/beneficiarios', {
    params: fresh ? { fresh: 1 } : undefined,
    signal,
  });
  return data.data;
}
