import { useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { PasswordField } from '../../../components/PasswordField.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { IconCheck, IconShield } from '../../../components/icons.jsx';
import { getErrorMessage } from '../../../services/api.js';
import { copyText } from '../../../utils/clipboard.js';
import { useAuth } from '../AuthContext.jsx';
import { disableTwoFactor, enableTwoFactor, startTwoFactorSetup } from '../services/auth.service.js';

const onlyDigits = (value) => value.replace(/\D/g, '').slice(0, 6);

/**
 * Activar / desactivar la verificación en dos pasos (TOTP).
 * Pasos al activar: password → escanear QR y confirmar un código → guardar los códigos de respaldo.
 */
export default function TwoFactorModal({ onClose }) {
  const toast = useToast();
  const { user, reloadUser } = useAuth();
  const wasEnabled = Boolean(user?.two_factor);

  const [step, setStep] = useState(wasEnabled ? 'manage' : 'intro'); // intro | scan | codes | manage
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState(null); // { secret, qr }
  const [backupCodes, setBackupCodes] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo completar la acción'));
    } finally {
      setBusy(false);
    }
  }

  const begin = (e) => {
    e.preventDefault();
    return run(async () => {
      setSetup(await startTwoFactorSetup(password));
      setPassword('');
      setCode('');
      setStep('scan');
    });
  };

  const confirm = (e) => {
    e.preventDefault();
    return run(async () => {
      const data = await enableTwoFactor(code);
      setBackupCodes(data.backupCodes);
      setCode('');
      setSetup(null);
      setStep('codes');
    });
  };

  const disable = (e) => {
    e.preventDefault();
    return run(async () => {
      await disableTwoFactor({ password, code });
      await reloadUser();
      toast.success('Verificación en dos pasos desactivada.');
      onClose();
    });
  };

  async function finish() {
    try {
      await reloadUser(); // refleja el nuevo estado en el menú y en el aviso del panel
    } catch {
      // si falla, el estado se corrige en la próxima carga
    }
    onClose();
  }

  async function copyCodes() {
    if (await copyText(backupCodes.join('\n'))) toast.success('Códigos copiados.');
  }

  function downloadCodes() {
    const text = `IPC INSEP - Códigos de respaldo (cada uno sirve una sola vez)\n\n${backupCodes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: 'ipc-insep-codigos-respaldo.txt',
    });
    link.click();
    URL.revokeObjectURL(url);
  }

  const titles = {
    intro: 'Verificación en dos pasos',
    scan: 'Escanea el código QR',
    codes: 'Guarda tus códigos de respaldo',
    manage: 'Verificación en dos pasos',
  };

  return (
    <Modal
      title={titles[step]}
      subtitle={
        step === 'manage'
          ? 'Tu cuenta está protegida con un segundo paso.'
          : 'Protege la cuenta de Super Admin con un código de tu celular.'
      }
      icon={<IconShield />}
      onClose={step === 'codes' ? finish : onClose}
      width={460}
    >
      {error && <div className="alert error">{error}</div>}

      {step === 'intro' && (
        <form className="form-sections" onSubmit={begin}>
          <div className="security-tip">
            <IconShield width={16} height={16} />
            <span>
              Al iniciar sesión, además de la contraseña se pedirá un código de 6 dígitos que cambia cada 30
              segundos. Necesitas una app como <b>Google Authenticator</b>, <b>Microsoft Authenticator</b> o{' '}
              <b>Authy</b>.
            </span>
          </div>
          <div className="field-group">
            <label>Confirma tu contraseña para continuar</label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={0}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={busy || !password}>
              {busy ? 'Preparando...' : 'Comenzar'}
            </button>
          </div>
        </form>
      )}

      {step === 'scan' && setup && (
        <form className="form-sections" onSubmit={confirm}>
          <ol className="twofa-steps">
            <li>
              Abre tu app autenticadora y elige <b>Agregar cuenta</b> → <b>Escanear código QR</b>.
            </li>
            <li>Escanea este código:</li>
          </ol>
          <div className="twofa-qr">
            <img src={setup.qr} alt="Código QR para la app autenticadora" width="220" height="220" />
          </div>
          <details className="twofa-manual">
            <summary>¿No puedes escanear? Escribe la clave a mano</summary>
            <code>{setup.secret.match(/.{1,4}/g).join(' ')}</code>
          </details>
          <div className="field-group">
            <label htmlFor="twofa-code">Escribe el código de 6 dígitos que muestra la app</label>
            <input
              id="twofa-code"
              className="twofa-code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(onlyDigits(e.target.value))}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={busy || code.length !== 6}>
              {busy ? 'Verificando...' : 'Activar'}
            </button>
          </div>
        </form>
      )}

      {step === 'codes' && (
        <div className="form-sections">
          <div className="alert success">
            <IconCheck width={17} height={17} />
            <span>La verificación en dos pasos quedó activada.</span>
          </div>
          <p className="twofa-note">
            Si pierdes el celular, cada uno de estos códigos te deja entrar <b>una sola vez</b>. Guárdalos en
            un lugar seguro: <b>no se volverán a mostrar</b>.
          </p>
          <ul className="twofa-codes">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="twofa-code-actions">
            <button type="button" className="btn-outline" onClick={copyCodes}>
              Copiar
            </button>
            <button type="button" className="btn-outline" onClick={downloadCodes}>
              Descargar
            </button>
          </div>
          <label className="twofa-saved">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            Ya guardé mis códigos de respaldo
          </label>
          <div className="modal-actions">
            <button type="button" className="btn-primary" disabled={!saved} onClick={finish}>
              Listo
            </button>
          </div>
        </div>
      )}

      {step === 'manage' && (
        <form className="form-sections" onSubmit={disable}>
          <div className="alert success">
            <IconCheck width={17} height={17} />
            <span>
              La verificación en dos pasos está <b>activa</b>.
            </span>
          </div>
          <p className="twofa-note">
            Para desactivarla confirma tu contraseña y escribe un código actual de tu app (o un código de
            respaldo).
          </p>
          <div className="field-group">
            <label>Contraseña</label>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={0}
            />
          </div>
          <div className="field-group">
            <label htmlFor="twofa-off-code">Código de verificación</label>
            <input
              id="twofa-off-code"
              className="twofa-code-input"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose}>
              Cerrar
            </button>
            <button className="btn-danger" disabled={busy || !password || code.trim().length < 6}>
              {busy ? 'Desactivando...' : 'Desactivar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
