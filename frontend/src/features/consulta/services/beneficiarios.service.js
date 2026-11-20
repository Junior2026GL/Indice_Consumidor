import { api } from '../../../services/api.js';

/** { encontrado, items: [{ num, grupo, identificador, cuenta_occidente, entrega: { entregado_at, entregado_por } | null }] } */
export async function buscarPorDni(dni, { signal } = {}) {
  const { data } = await api.get('/beneficiarios/buscar', { params: { dni }, signal });
  return data.data;
}

/** { encontrado, item: { numero, identificador, nombre, indemnizacion } | null } */
export async function buscarIndemnizacion(dni, { signal } = {}) {
  const { data } = await api.get('/beneficiarios/indemnizacion', { params: { dni }, signal });
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
