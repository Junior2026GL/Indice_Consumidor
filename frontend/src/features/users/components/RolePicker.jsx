import { IconShield, IconCheck } from '../../../components/icons.jsx';
import { roleLabels, roleMeta } from '../constants.js';

export default function RolePicker({ roles, value, onChange }) {
  return (
    <div className="role-picker">
      {roles.map((r) => {
        const meta = roleMeta[r.nombre] || { desc: '', tone: 'blue' };
        const active = value === r.nombre;
        return (
          <label key={r.id} className={`role-option ${meta.tone} ${active ? 'active' : ''}`}>
            <input
              type="radio"
              name="rol"
              value={r.nombre}
              checked={active}
              onChange={() => onChange(r.nombre)}
            />
            <span className={`role-option-icon ${meta.tone}`}>
              <IconShield width={16} height={16} />
            </span>
            <span className="role-option-text">
              <b>{roleLabels[r.nombre] || r.nombre}</b>
              <small>{meta.desc}</small>
            </span>
            <span className="role-option-check">
              <IconCheck width={13} height={13} />
            </span>
          </label>
        );
      })}
    </div>
  );
}
