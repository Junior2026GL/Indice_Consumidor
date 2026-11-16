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
