import { IconEdit, IconKey, IconPower, IconEye } from '../../../components/icons.jsx';
import { initials } from '../../../utils/format.js';
import { roleLabels, roleMeta } from '../constants.js';

export default function UsersTable({
  users,
  currentUserId,
  onView,
  onEdit,
  onResetPassword,
  onToggleActive,
}) {
  return (
    <table className="users-table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Último acceso</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const meta = roleMeta[user.rol] || { tone: 'blue' };
          const isSelf = user.id === currentUserId;
          return (
            <tr key={user.id}>
              <td>
                <div className="user-cell">
                  <span className={`avatar ring-${meta.tone}`}>{initials(user.nombre)}</span>
                  <div className="user-cell-text">
                    <b>
                      {user.nombre}
                      {isSelf && <span className="badge-muted user-you-badge">Tú</span>}
                    </b>
                    <small>
                      @{user.usuario}
                      {user.email ? ` · ${user.email}` : ''}
                    </small>
                  </div>
                </div>
              </td>
              <td data-label="Rol">
                <span className={`role-badge ${user.rol}`}>{roleLabels[user.rol] || user.rol}</span>
              </td>
              <td data-label="Estado">
                <span className={`user-status ${user.activo ? 'active' : 'inactive'}`}>
                  <i />
                  {user.activo ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td data-label="Último acceso">
                <span className={user.ultimo_acceso_at ? '' : 'texto-muted-soft'}>
                  {user.ultimo_acceso_at || 'Nunca'}
                </span>
              </td>
              <td className="actions-cell">
                <div className="actions-row">
                  <button
                    className="icon-btn"
                    title="Ver detalle"
                    aria-label="Ver detalle"
                    onClick={() => onView(user)}
                  >
                    <IconEye />
                  </button>
                  <button
                    className="icon-btn"
                    title="Editar"
                    aria-label="Editar"
                    onClick={() => onEdit(user)}
                  >
                    <IconEdit />
                  </button>
                  <button
                    className="icon-btn"
                    title="Restablecer contraseña"
                    aria-label="Restablecer contraseña"
                    onClick={() => onResetPassword(user)}
                  >
                    <IconKey />
                  </button>
                  <button
                    className="icon-btn danger"
                    title={user.activo ? 'Desactivar' : 'Activar'}
                    aria-label={user.activo ? 'Desactivar' : 'Activar'}
                    onClick={() => onToggleActive(user)}
                    disabled={isSelf && user.activo}
                  >
                    <IconPower />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
