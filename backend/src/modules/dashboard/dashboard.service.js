import { env } from '../../config/env.js';
import * as repository from './dashboard.repository.js';

const CACHE_MS = 60_000;
let cache = null;

/** Descarta las cifras guardadas para que el siguiente pedido las recalcule. */
export function invalidateDashboardCache() {
  cache = null;
}

/** Totales y grupos de beneficiarios: recorren toda la tabla y casi no cambian, se guardan 60 s. */
async function totalesDeBeneficiarios(fresh) {
  if (!fresh && !env.isTest && cache && cache.expires > Date.now()) return cache.data;

  const { totales, grupos } = await repository.getBeneficiariosTotales();
  const data = {
    total: Number(totales.total),
    unicos: Number(totales.unicos),
    conCuenta: Number(totales.con_cuenta),
    porGrupo: grupos.map((g) => ({ grupo: g.grupo, total: Number(g.total) })),
  };

  cache = { data, expires: Date.now() + CACHE_MS };
  return data;
}

/**
 * Cifras del dashboard. Las entregas se leen SIEMPRE en vivo (cada entrega marcada o anulada se ve
 * al instante); el resto se guarda 60 segundos para no repetir el barrido de la tabla.
 * `fresh` (botón "Actualizar") salta la copia guardada.
 */
export async function beneficiariosResumen({ fresh = false } = {}) {
  const [base, entregasRegistradas] = await Promise.all([
    totalesDeBeneficiarios(fresh),
    repository.contarEntregas(),
  ]);

  // La entrega es por DNI, así que se compara contra los DNI distintos.
  const entregados = Math.min(entregasRegistradas, base.unicos);

  return {
    total: base.total,
    unicos: base.unicos,
    conCuenta: base.conCuenta,
    sinCuenta: base.total - base.conCuenta,
    entregados,
    pendientes: base.unicos - entregados,
    porGrupo: base.porGrupo,
    actualizado: new Date().toISOString(),
  };
}
