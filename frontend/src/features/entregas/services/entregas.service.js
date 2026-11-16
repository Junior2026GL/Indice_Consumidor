import { api } from '../../../services/api.js';

/** { total, usuarios: [{ usuario_id, nombre, usuario, total, primera, ultima }] } */
export async function getResumen(params) {
  const { data } = await api.get('/entregas/resumen', { params });
  return data.data;
}

/** { items: [{ id, identificador, usuario_id, usuario_nombre, entregado_at, num, grupo }], total } */
export async function listEntregas(params) {
  const { data } = await api.get('/entregas', { params });
  return data.data;
}

/** Borra TODAS las entregas. El servidor exige la palabra de confirmación. Devuelve { eliminadas }. */
export async function vaciarEntregas() {
  const { data } = await api.delete('/entregas', { data: { confirmacion: 'VACIAR' } });
  return data.data;
}
