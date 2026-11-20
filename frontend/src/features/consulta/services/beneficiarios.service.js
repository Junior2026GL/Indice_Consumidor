import { api } from '../../../services/api.js';

/** { encontrado, items: [{ num, grupo, identificador, cuenta_occidente, entrega: { entregado_at, entregado_por } | null }] } */
export async function buscarPorDni(dni, { signal } = {}) {
  const { data } = await api.get('/beneficiarios/buscar', { params: { dni }, signal });
  return data.data;
}

/** criterio: { dni } o { nombre }. -> { encontrado, truncado, items: [{ numero, identificador, nombre, indemnizacion }] } */
export async function buscarIndemnizacion(criterio, { signal } = {}) {
  const { data } = await api.get('/beneficiarios/indemnizacion', { params: criterio, signal });
  return data.data;
}

export async function marcarEntrega(dni) {
  const { data } = await api.post('/beneficiarios/entrega', { dni });
  return data.data;
}

/** Solo Super Admin. */
export async function anularEntrega(dni) {
  const { data } = await api.delete(`/beneficiarios/entrega/${dni}`);
  return data.data;
}
