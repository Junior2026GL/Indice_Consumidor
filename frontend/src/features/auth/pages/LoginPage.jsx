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
        <div className="login-panel">
          <form className="login-card" onSubmit={submit}>
            <div className="login-card-head">
              <span className="login-logo" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="30"
                  height="30"
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
              <div className="brand large">
                IPC <span>INSEP</span>
              </div>
              <p>Consulta de beneficiarios</p>
              <small>Ingresa con tu usuario y contraseña</small>
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
