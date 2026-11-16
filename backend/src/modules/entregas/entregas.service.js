import * as repository from './entregas.repository.js';

export async function resumen({ desde, hasta }) {
  const usuarios = (await repository.resumenPorUsuario({ desde, hasta })).map((row) => ({
    usuario_id: row.usuario_id,
    nombre: row.nombre,
    usuario: row.usuario,
    total: Number(row.total),
    primera: row.primera,
    ultima: row.ultima,
  }));

  return { total: usuarios.reduce((sum, u) => sum + u.total, 0), usuarios };
}

export function list(query) {
  return repository.listEntregas(query);
}
