import { IconUsers, IconCheck, IconPower, IconShield } from '../../../components/icons.jsx';

export default function UserStats({ stats }) {
  const s = stats || { total: 0, activos: 0, inactivos: 0, administradores: 0 };

  return (
    <div className="card-grid">
      <div className="stat-card blue">
        <div className="stat-card-icon blue">
          <IconUsers />
        </div>
        <span>Total de usuarios</span>
        <strong>{s.total}</strong>
      </div>
      <div className="stat-card green">
        <div className="stat-card-icon green">
          <IconCheck />
        </div>
        <span>Activos</span>
        <strong>{s.activos}</strong>
      </div>
      <div className="stat-card red">
        <div className="stat-card-icon red">
          <IconPower />
        </div>
        <span>Inactivos</span>
        <strong>{s.inactivos}</strong>
      </div>
      <div className="stat-card amber">
        <div className="stat-card-icon amber">
          <IconShield />
        </div>
        <span>Administradores</span>
        <strong>{s.administradores}</strong>
      </div>
    </div>
  );
}
