import Modal from '../../../components/Modal.jsx';
import { IconUser, IconMail, IconPhone, IconPower, IconCalendar } from '../../../components/icons.jsx';
import { initials } from '../../../utils/format.js';
import { roleLabels, roleMeta } from '../constants.js';

export default function UserDetailModal({ user, onClose }) {
  const tone = (roleMeta[user.rol] || {}).tone || 'blue';

  return (
    <Modal
      title="Detalle del usuario"
      icon={<IconUser />}
      onClose={onClose}
      width={420}
      footer={
        <button className="btn-outline" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="profile-info">
        <span className={`avatar ring-${tone}`} style={{ width: 56, height: 56, fontSize: 20 }}>
          {initials(user.nombre)}
        </span>
        <h3 style={{ margin: '12px 0 2px' }}>{user.nombre}</h3>
        <p style={{ margin: 0, color: 'var(--color-muted)' }}>@{user.usuario}</p>
        <span className={`role-badge ${user.rol}`} style={{ marginTop: 10 }}>
          {roleLabels[user.rol] || user.rol}
        </span>
      </div>
      <div className="detail-list">
        <div>
          <span>
            <IconMail width={14} height={14} /> Correo
          </span>
          <strong>{user.email || 'Sin correo'}</strong>
        </div>
        <div>
          <span>
            <IconPhone width={14} height={14} /> Teléfono
          </span>
          <strong>{user.telefono || 'Sin teléfono'}</strong>
        </div>
        <div>
          <span>
            <IconPower width={14} height={14} /> Estado
          </span>
          <strong>
            <span className={`user-status ${user.activo ? 'active' : 'inactive'}`}>
              <i />
              {user.activo ? 'Activo' : 'Inactivo'}
            </span>
          </strong>
        </div>
        <div>
          <span>
            <IconCalendar width={14} height={14} /> Último acceso
          </span>
          <strong>{user.ultimo_acceso_at || 'Nunca'}</strong>
        </div>
      </div>
    </Modal>
  );
}
