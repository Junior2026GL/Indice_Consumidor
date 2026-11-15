import { useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { PasswordField, PasswordStrengthMeter } from '../../../components/PasswordField.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconUser, IconEdit, IconMail, IconPhone } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { PASSWORD_HINT } from '../../../utils/password.js';
import { createUser, updateUser } from '../services/users.service.js';
import RolePicker from './RolePicker.jsx';

const emptyForm = { nombre: '', usuario: '', email: '', telefono: '', password: '', rol: 'NORMAL' };

function formFromUser(user) {
  return {
    nombre: user.nombre,
    usuario: user.usuario,
    email: user.email || '',
    telefono: user.telefono || '',
    rol: user.rol,
  };
}

/** Crear (sin `user`) o editar (con `user`) un usuario. */
export default function UserFormModal({ user, roles, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = Boolean(user);
  const formId = isEdit ? 'form-editar-usuario' : 'form-crear-usuario';

  const [form, setForm] = useState(isEdit ? formFromUser(user) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        await updateUser(user.id, form);
        toast.success('Usuario actualizado correctamente.');
      } else {
        await createUser(form);
        toast.success('Usuario creado correctamente.');
      }
      onSaved();
    } catch (err) {
      const message = getErrorMessage(
        err,
        isEdit ? 'No se pudo actualizar el usuario' : 'No se pudo crear el usuario'
      );
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      subtitle={isEdit ? user.nombre : 'Crea una cuenta de acceso al sistema.'}
      icon={isEdit ? <IconEdit /> : <IconUser />}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form={formId} className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </>
      }
    >
      <form id={formId} className="form-sections" onSubmit={submit}>
        {error && <div className="alert error">{error}</div>}

        <fieldset className="form-section">
          <legend>Información personal</legend>
          <div className="form-grid">
            <div>
              <label>Nombre completo</label>
              <div className="input-icon">
                <IconUser />
                <input
                  value={form.nombre}
                  onChange={set('nombre')}
                  placeholder={isEdit ? undefined : 'Ej. Ana Martínez'}
                  maxLength={150}
                  required
                />
              </div>
            </div>
            <div>
              <label>
                Teléfono <span className="label-optional">(opcional)</span>
              </label>
              <div className="input-icon">
                <IconPhone />
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={set('telefono')}
                  placeholder="9999-9999"
                  maxLength={30}
                />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>
                Correo electrónico <span className="label-optional">(opcional)</span>
              </label>
              <div className="input-icon">
                <IconMail />
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder={isEdit ? undefined : 'nombre@ejemplo.com'}
                  maxLength={180}
                />
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Credenciales de acceso</legend>
          <div className="form-grid">
            <div>
              <label>Usuario</label>
              <div className="input-icon">
                <IconUser />
                <input
                  value={form.usuario}
                  onChange={set('usuario')}
                  autoComplete="off"
                  placeholder={isEdit ? undefined : 'usuario.acceso'}
                  pattern="[a-zA-Z0-9._\-]{3,40}"
                  title="3 a 40 caracteres: letras, números, puntos, guiones"
                  required
                />
              </div>
            </div>
            {!isEdit && (
              <div>
                <label>Contraseña</label>
                <PasswordField
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Mín. 10 caracteres"
                  autoComplete="new-password"
                />
                <small className="field-hint">{PASSWORD_HINT}</small>
                <PasswordStrengthMeter value={form.password} />
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Rol y permisos</legend>
          <RolePicker roles={roles} value={form.rol} onChange={(rol) => setForm((f) => ({ ...f, rol }))} />
        </fieldset>
      </form>
    </Modal>
  );
}
