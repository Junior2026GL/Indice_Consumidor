import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { PasswordField } from '../../../components/PasswordField.jsx';
import { IconUser, IconArrowRight, IconAlert } from '../../../components/icons.jsx';

export default function LoginPage() {
  const { status, user, login } = useAuth();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to={user?.rol === 'SUPER_ADMIN' ? '/dashboard' : '/'} replace />;
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(form);
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo iniciar sesión'));
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-box">
        <aside className="login-aside">
          <div className="login-aside-top">
            <div className="brand large light">
              IPC <span>INSEP</span>
            </div>
          </div>
        </aside>

        <div className="login-panel">
          {/* Bienvenida sobre la tarjeta; en celular se oculta porque la marca ya está en el encabezado */}
          <div className="login-welcome">
            <span className="login-welcome-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="34"
                height="34"
                fill="none"
                stroke="#fff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m20 20-4.2-4.2" />
              </svg>
            </span>
            <h2>Bienvenido</h2>
            <p>Sistema de consulta de beneficiarios</p>
            <div className="login-welcome-chips">
              <span>Consulta por DNI</span>
              <span>Registro de entregas</span>
            </div>
          </div>

          <form className="login-card" onSubmit={submit}>
            <div className="login-card-head">
              <div className="brand large">
                IPC <span>INSEP</span>
              </div>
              <p>Ingresa con tu usuario</p>
            </div>

            {error && (
              <div className="alert error">
                <IconAlert width={17} height={17} />
                <span>{error}</span>
              </div>
            )}

            <label>Usuario</label>
            <div className="input-icon">
              <IconUser />
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={form.usuario}
                onChange={(e) => setForm({ ...form, usuario: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div className="login-password-group">
              <label>Contraseña</label>
              <PasswordField
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                minLength={0}
              />
            </div>

            <button className="btn-primary" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'} <IconArrowRight />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
