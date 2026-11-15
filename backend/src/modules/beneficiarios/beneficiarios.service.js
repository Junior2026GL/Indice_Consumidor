import { conflict, notFoundError } from '../../shared/errors/AppError.js';
import * as repository from './beneficiarios.repository.js';

export async function buscarPorDni(dni) {
  const items = await repository.findByDni(dni);
  // La entrega es por DNI: si hay varias filas con el mismo DNI, todas comparten el estado.
  const entrega = items.length ? await repository.findEntrega(dni) : null;

  return {
    encontrado: items.length > 0,
    items: items.map((item) => ({ ...item, entrega })),
  };
}

export async function marcarEntregado(dni, userId) {
  if (!(await repository.existsByDni(dni))) {
    throw notFoundError('No se encontró un beneficiario con ese DNI');
  }

  try {
    await repository.insertEntrega(dni, userId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw conflict('Este beneficiario ya fue marcado como entregado');
    }
    throw error;
  }

  return repository.findEntrega(dni);
}

export async function anularEntrega(dni) {
  const removed = await repository.deleteEntrega(dni);
  if (!removed) throw notFoundError('Este beneficiario no tiene una entrega registrada');
}
