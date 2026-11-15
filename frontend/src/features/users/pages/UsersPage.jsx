import { useEffect, useState } from 'react';
import PageHeader from '../../../components/PageHeader.jsx';
import Pagination from '../../../components/Pagination.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconPlus, IconUsers, IconSearch } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { listRoles, setUserStatus } from '../services/users.service.js';
import { useUsers } from '../hooks/useUsers.js';
import { PAGE_SIZE, roleLabels } from '../constants.js';
import UserStats from '../components/UserStats.jsx';
import UsersTable from '../components/UsersTable.jsx';
import UserFormModal from '../components/UserFormModal.jsx';
import ResetPasswordModal from '../components/ResetPasswordModal.jsx';
import UserDetailModal from '../components/UserDetailModal.jsx';

export default function UsersPage() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const users = useUsers();

  const [roles, setRoles] = useState([]);
  // Un solo modal abierto a la vez: { type: 'create' | 'edit' | 'reset' | 'view', user? }
  const [modal, setModal] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    listRoles().then(setRoles).catch(console.error);
  }, []);

  const closeModal = () => setModal(null);

  function handleSaved() {
    closeModal();
    users.reload();
  }

  async function toggleActive(user) {
    setActionError('');
    try {
      await setUserStatus(user.id, !user.activo);
      toast.success(`Usuario ${user.activo ? 'desactivado' : 'activado'} correctamente.`);
      users.reload();
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo actualizar el estado');
      setActionError(message);
      toast.error(message);
    }
  }

  const error = actionError || users.error;
  const hasFilters = Boolean(users.search.trim()) || users.roleFilter !== 'TODOS';

  return (
    <>
      <PageHeader title="Usuarios" description="Gestión de accesos y roles del sistema." />

      <div className="users-page-actions">
        <button className="btn-primary" onClick={() => setModal({ type: 'create' })}>
          <IconPlus /> Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="alert error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="users-page-content">
        <UserStats stats={users.stats} />

        <div className="panel table-wrap">
          <div className="users-toolbar">
            <div>
              <h3 className="panel-title" style={{ margin: 0 }}>
                Lista de usuarios
              </h3>
              <span className="badge-muted" style={{ marginTop: 8 }}>
                <IconUsers /> {users.total} usuario{users.total === 1 ? '' : 's'}
                {hasFilters && users.stats ? ` de ${users.stats.total}` : ''}
              </span>
            </div>

            <div className="users-filters">
              <div className="input-icon users-search">
                <IconSearch />
                <input
                  placeholder="Buscar por nombre, usuario o correo…"
                  value={users.search}
                  onChange={(e) => users.setSearch(e.target.value)}
                  maxLength={100}
                />
              </div>
              <select
                value={users.roleFilter}
                onChange={(e) => users.setRoleFilter(e.target.value)}
                className="users-role-filter"
                aria-label="Filtrar por rol"
              >
                <option value="TODOS">Todos los roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.nombre}>
                    {roleLabels[r.nombre] || r.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {users.loading && users.items.length === 0 ? (
            <div className="table-loading">
              {[0, 1, 2].map((i) => (
                <div className="table-loading-row" key={i} />
              ))}
            </div>
          ) : users.items.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">👤</span>
              <div className="empty-state-title">
                {hasFilters ? 'Sin resultados para tu búsqueda' : 'Sin usuarios registrados'}
              </div>
              <p>
                {hasFilters
                  ? 'Intenta con otro nombre, usuario, correo o filtro de rol.'
                  : 'Crea el primer usuario para empezar a gestionar accesos.'}
              </p>
            </div>
          ) : (
            <UsersTable
              users={users.items}
              currentUserId={currentUser?.id}
              onView={(user) => setModal({ type: 'view', user })}
              onEdit={(user) => setModal({ type: 'edit', user })}
              onResetPassword={(user) => setModal({ type: 'reset', user })}
              onToggleActive={toggleActive}
            />
          )}
        </div>

        <Pagination page={users.page} pageSize={PAGE_SIZE} total={users.total} onPageChange={users.setPage} />
      </div>

      {modal?.type === 'create' && <UserFormModal roles={roles} onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === 'edit' && (
        <UserFormModal user={modal.user} roles={roles} onClose={closeModal} onSaved={handleSaved} />
      )}
      {modal?.type === 'reset' && <ResetPasswordModal user={modal.user} onClose={closeModal} />}
      {modal?.type === 'view' && <UserDetailModal user={modal.user} onClose={closeModal} />}
    </>
  );
}
