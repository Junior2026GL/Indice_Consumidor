import { useState } from 'react';
import { IconShield } from '../../../components/icons.jsx';
import { useAuth } from '../AuthContext.jsx';
import TwoFactorModal from './TwoFactorModal.jsx';

const DISMISS_KEY = 'ipc_2fa_banner_dismissed';

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Aviso en el panel de administración mientras el Super Admin no tenga la verificación en dos pasos. */
export default function TwoFactorBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [open, setOpen] = useState(false);

  if (!user || user.rol !== 'SUPER_ADMIN') return null;

  return (
    <>
      {!user.two_factor && !dismissed && (
        <div className="twofa-banner" role="note">
          <IconShield width={20} height={20} />
          <div className="twofa-banner-text">
            <strong>Protege tu cuenta de Super Admin</strong>
            <span>
              Activa la verificación en dos pasos: aunque alguien conozca tu contraseña, no podrá entrar.
            </span>
          </div>
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            Activar ahora
          </button>
          <button
            type="button"
            className="twofa-banner-close"
            aria-label="Ocultar aviso"
            onClick={() => {
              setDismissed(true);
              try {
                sessionStorage.setItem(DISMISS_KEY, '1');
              } catch {
                // sin almacenamiento, el aviso reaparece en la próxima visita
              }
            }}
          >
            ×
          </button>
        </div>
      )}
      {open && <TwoFactorModal onClose={() => setOpen(false)} />}
    </>
  );
}
