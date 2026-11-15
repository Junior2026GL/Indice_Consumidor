import { useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { PasswordField, PasswordStrengthMeter } from '../../../components/PasswordField.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconKey } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { PASSWORD_HINT } from '../../../utils/password.js';
import { resetUserPassword } from '../services/users.service.js';

export default function ResetPasswordModal({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await resetUserPassword(user.id, password);
      toast.success('Contraseña restablecida correctamente.');
      onClose();
    } catch (err) {
      const message = getErrorMessage(err, 'No se pudo restablecer la contraseña');
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Restablecer contraseña"
      subtitle={user.nombre}
      icon={<IconKey />}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-reset-password" className="btn-primary" disabled={saving}>
            {saving ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </>
      }
    >
      <form id="form-reset-password" className="form-stack" onSubmit={submit}>
        {error && <div className="alert error">{error}</div>}
        <div className="alert" style={{ marginBottom: 4 }}>
          Se cerrarán todas las sesiones del usuario y deberá usar esta contraseña en su próximo inicio de
          sesión.
        </div>
        <label>Nueva contraseña</label>
        <PasswordField
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mín. 10 caracteres"
          autoComplete="new-password"
          autoFocus
        />
        <small className="field-hint">{PASSWORD_HINT}</small>
        <PasswordStrengthMeter value={password} />
      </form>
    </Modal>
  );
}
