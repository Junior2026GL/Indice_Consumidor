import bcrypt from 'bcryptjs';
import { badRequest, conflict, notFoundError } from '../../shared/errors/AppError.js';
import { ROLES } from '../../shared/constants/roles.js';
import { revokeAllForUser } from '../auth/auth.repository.js';
import * as repository from './users.repository.js';

const BCRYPT_COST = 12;

async function resolveRoleId(rolNombre) {
  const roles = await repository.listRoles();
  const role = roles.find((r) => r.nombre === rolNombre);
  if (!role) throw badRequest('Rol inválido');
  return role.id;
}

/** Garantiza que el sistema nunca se quede sin ningún Super Admin activo. */
async function assertNotLastSuperAdmin(user, motivo) {
  if (user.rol !== ROLES.SUPER_ADMIN || !user.activo) return;
  if ((await repository.countOtherActiveSuperAdmins(user.id)) === 0) {
    throw badRequest(`No puedes ${motivo} al único Super Admin activo`);
  }
}

export async function list(query) {
  const [{ items, total }, stats] = await Promise.all([
    repository.listUsers(query),
    repository.getUserStats(),
  ]);
  return { items, total, stats };
}

export function roles() {
  return repository.listRoles();
}

export async function getById(id) {
  const user = await repository.findUserById(id);
  if (!user) throw notFoundError('Usuario no encontrado');
  return user;
}

export async function create(data) {
  if (await repository.findUsernameOwner(data.usuario)) {
    throw conflict('Ya existe un usuario con ese nombre de usuario');
  }

  const [rolId, passwordHash] = await Promise.all([
    resolveRoleId(data.rol),
    bcrypt.hash(data.password, BCRYPT_COST),
  ]);

  const id = await repository.createUser({
    nombre: data.nombre,
    usuario: data.usuario,
    email: data.email,
    telefono: data.telefono,
    passwordHash,
    rolId,
  });

  return getById(id);
}

export async function update(id, data, currentUserId) {
  const user = await getById(id);

  const owner = await repository.findUsernameOwner(data.usuario);
  if (owner && Number(owner.id) !== Number(id)) {
    throw conflict('Ya existe un usuario con ese nombre de usuario');
  }

  if (data.rol !== user.rol) {
    if (Number(id) === Number(currentUserId)) throw badRequest('No puedes cambiar tu propio rol');
    await assertNotLastSuperAdmin(user, 'quitar el rol de');
  }

  await repository.updateUser(id, {
    nombre: data.nombre,
    usuario: data.usuario,
    email: data.email,
    telefono: data.telefono,
    rolId: await resolveRoleId(data.rol),
  });

  // El middleware de autenticación lee el rol vigente de la BD, así que el cambio aplica de inmediato.
  return getById(id);
}

export async function resetPassword(id, password) {
  await getById(id);
  await repository.updatePassword(id, await bcrypt.hash(password, BCRYPT_COST));
  // La contraseña anterior pudo estar comprometida: se cierran todas sus sesiones.
  await revokeAllForUser(id);
  return { ok: true };
}

export async function setActive(id, activo, currentUserId) {
  const user = await getById(id);

  if (!activo) {
    if (Number(user.id) === Number(currentUserId)) throw badRequest('No puedes desactivar tu propio usuario');
    await assertNotLastSuperAdmin(user, 'desactivar');
  }

  await repository.setActive(id, activo);
  if (!activo) await revokeAllForUser(id);
  return getById(id);
}
