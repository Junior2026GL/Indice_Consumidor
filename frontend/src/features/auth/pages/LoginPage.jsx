import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { PasswordField } from '../../../components/PasswordField.jsx';
import { InstallAppButton } from '../../../components/InstallAppButton.jsx';
import { IconUser, IconArrowRight, IconAlert, IconShield } from '../../../components/icons.jsx';
import { takeIdleLogoutNotice } from '../idle.js';

export default function LoginPage() {
  const { status, user, login, loginWithCode } = useAuth();
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [challenge, setChallenge] = useState(null); // token del paso 2 (verificación en dos pasos)
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Se lee una sola vez: avisa si la sesión anterior se cerró por inactividad.
  const [idleNotice] = useState(takeIdleLogoutNotice);

  if (status === 'authenticated') {
    return <Navigate to={user?.rol === 'SUPER_ADMIN' ? '/dashboard' : '/'} replace />;
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(form);
      if (result.requires2fa) {
        setChallenge(result.challengeToken);
        setForm((f) => ({ ...f, password: '' })); // la contraseña ya no se necesita en pantalla
        setLoading(false);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo iniciar sesión'));
      setLoading(false);
    }
  }

  async function submitCode(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginWithCode({ challengeToken: challenge, code: code.trim() });
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo verificar el código'));
      // Si la verificación expiró hay que volver al paso 1; si solo falló el código se reintenta.
      if (err.response?.status === 401 && /expir/i.test(err.response.data?.message || '')) {
        setChallenge(null);
      }
      setCode('');
      setLoading(false);
    }
  }

  function backToPassword() {
    setChallenge(null);
    setCode('');
    setError('');
  }

  const logo = (
    <span className="login-logo" aria-hidden="true">
      {challenge ? (
        <IconShield width={30} height={30} stroke="#fff" />
      ) : (
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
      )}
    </span>
  );

  return (
    <div className="login-shell">
      <div className="login-box">
        <div className="login-panel">
          {challenge ? (
            <form className="login-card" onSubmit={submitCode}>
              <div className="login-card-head">
                {logo}
                <div className="brand large">
                  IPC <span>INSEP</span>
                </div>
                <p>Verificación en dos pasos</p>
                <small>Escribe el código de 6 dígitos de tu app autenticadora</small>
              </div>

              {error && (
                <div className="alert error">
                  <IconAlert width={17} height={17} />
                  <span>{error}</span>
                </div>
              )}

              <label htmlFor="code2fa">Código de verificación</label>
              <input
                id="code2fa"
                className="login-code-input"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                required
              />
              <small className="login-code-help">
                ¿Perdiste el celular? Escribe uno de tus <b>códigos de respaldo</b> (XXXXX-XXXXX).
              </small>

              <button className="btn-primary" disabled={loading || code.trim().length < 6}>
                {loading ? 'Verificando...' : 'Verificar'} <IconArrowRight />
              </button>
              <button type="button" className="login-back" onClick={backToPassword}>
                ← Volver
              </button>
            </form>
          ) : (
            <form className="login-card" onSubmit={submit}>
              <div className="login-card-head">
                {logo}
                <div className="brand large">
                  IPC <span>INSEP</span>
                </div>
                <p>Consulta de beneficiarios</p>
                <small>Ingresa con tu usuario y contraseña</small>
              </div>

              {idleNotice && !error && (
                <div className="alert warning">
                  <IconAlert width={17} height={17} />
                  <span>Tu sesión se cerró por inactividad. Ingresa de nuevo para continuar.</span>
                </div>
              )}

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

              <InstallAppButton />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
