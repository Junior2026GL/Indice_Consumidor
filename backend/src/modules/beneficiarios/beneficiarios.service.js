import { ROLES } from '../../shared/constants/roles.js';
import { conflict, forbidden, notFoundError } from '../../shared/errors/AppError.js';
import * as repository from './beneficiarios.repository.js';

/**
 * Lo que ve el cliente de una entrega. puede_anular: el Super Admin siempre; los demás solo
 * si ellos mismos la registraron.
 */
function publicEntrega(row, user) {
  if (!row) return null;
  return {
    entregado_at: row.entregado_at,
    entregado_por: row.entregado_por,
    puede_anular: user.rol === ROLES.SUPER_ADMIN || row.usuario_id === user.sub,
  };
}

export async function buscarPorDni(dni, user) {
  const items = await repository.findByDni(dni);
  // La entrega es por DNI: si hay varias filas con el mismo DNI, todas comparten el estado.
  const entrega = items.length ? publicEntrega(await repository.findEntrega(dni), user) : null;

  return {
    encontrado: items.length > 0,
    items: items.map((item) => ({ ...item, entrega })),
  };
}

/** Siempre devuelve una lista (por DNI tiene 0 o 1 elemento). `truncado`: hay más coincidencias que las mostradas. */
export async function buscarIndemnizacion({ dni, nombre }) {
  if (dni) {
    const item = await repository.findIndemnizacionByDni(dni);
    return { encontrado: Boolean(item), items: item ? [item] : [], truncado: false };
  }
  const rows = await repository.findIndemnizacionByNombre(nombre);
  const max = repository.MAX_INDEMNIZACION_RESULTS;
  return { encontrado: rows.length > 0, items: rows.slice(0, max), truncado: rows.length > max };
}

export async function marcarEntregado(dni, user) {
  if (!(await repository.existsByDni(dni))) {
    throw notFoundError('No se encontró un beneficiario con ese DNI');
  }

  try {
    await repository.insertEntrega(dni, user.sub);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw conflict('Este beneficiario ya fue marcado como entregado');
    }
    throw error;
  }

  return publicEntrega(await repository.findEntrega(dni), user);
}

/** Super Admin: cualquier entrega. Los demás roles: solo las que ellos registraron. */
export async function anularEntrega(dni, user) {
  const own = user.rol === ROLES.SUPER_ADMIN ? undefined : user.sub;
  if (await repository.deleteEntrega(dni, own)) return;

  // No se borró nada: o no hay entrega, o es de otra persona.
  if (own && (await repository.findEntrega(dni))) {
    throw forbidden('Solo puedes anular las entregas que registraste tú');
  }
  throw notFoundError('Este beneficiario no tiene una entrega registrada');
}
