import { useState } from 'react';
import { IconLock, IconEye, IconEyeOff } from './icons.jsx';
import { PASSWORD_HINT, PASSWORD_MIN, PASSWORD_PATTERN, passwordStrength } from '../utils/password.js';

const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];

export function PasswordStrengthMeter({ value }) {
  if (!value) return null;
  const score = passwordStrength(value);
  return (
    <div className="pw-strength">
      <div className="pw-strength-track">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pw-strength-seg ${i < score ? `level-${score}` : ''}`} />
        ))}
      </div>
      <span className={`pw-strength-label level-${score}`}>{strengthLabels[score]}</span>
    </div>
  );
}

/**
 * `minLength` en 0 desactiva la política (para escribir la contraseña actual / iniciar sesión).
 * Por defecto aplica la política de contraseñas nuevas.
 */
export function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  required = true,
  minLength = PASSWORD_MIN,
}) {
  const [visible, setVisible] = useState(false);
  const enforcePolicy = Boolean(minLength);

  return (
    <div className="input-icon input-icon-end">
      <IconLock />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        minLength={enforcePolicy ? minLength : undefined}
        maxLength={200}
        pattern={enforcePolicy ? PASSWORD_PATTERN : undefined}
        title={enforcePolicy ? PASSWORD_HINT : undefined}
        required={required}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="input-end-btn"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible ? <IconEyeOff width={16} height={16} /> : <IconEye width={16} height={16} />}
      </button>
    </div>
  );
}
