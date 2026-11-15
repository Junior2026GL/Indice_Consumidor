import { env } from '../../config/env.js';
import * as repository from './dashboard.repository.js';

const CACHE_MS = 60_000;
let cache = null;

/**
 * Cifras del dashboard. Recorren toda la tabla, así que se guardan 60 segundos
 * en memoria: varias personas abriendo el panel no multiplican las consultas.
 * `fresh` (botón "Actualizar") salta la copia guardada.
 */
export async function beneficiariosResumen({ fresh = false } = {}) {
  if (!fresh && !env.isTest && cache && cache.expires > Date.now()) return cache.data;

  const { totales, grupos, entregados: entregasRegistradas } = await repository.getBeneficiariosResumen();
  const total = Number(totales.total);
  const unicos = Number(totales.unicos);
  const conCuenta = Number(totales.con_cuenta);
  // La entrega es por DNI, así que se compara contra los DNI distintos.
  const entregados = Math.min(Number(entregasRegistradas), unicos);

  const data = {
    total,
    unicos,
    conCuenta,
    sinCuenta: total - conCuenta,
    entregados,
    pendientes: unicos - entregados,
    porGrupo: grupos.map((g) => ({ grupo: g.grupo, total: Number(g.total) })),
    actualizado: new Date().toISOString(),
  };

  cache = { data, expires: Date.now() + CACHE_MS };
  return data;
}
