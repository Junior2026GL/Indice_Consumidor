import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { IconClock } from '../../components/icons.jsx';
import { useAuth } from './AuthContext.jsx';
import {
  IDLE_LIMIT_MS,
  IDLE_WARNING_MS,
  markIdleLogout,
  readLastActivity,
  writeLastActivity,
} from './idle.js';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'];

/**
 * Cierra la sesión tras IDLE_LIMIT_MS sin actividad del usuario. El último minuto muestra un aviso
 * con cuenta regresiva. Se basa en la hora real (no en un temporizador que se pausa), así que
 * funciona aunque el celular se haya bloqueado o la pestaña haya estado en segundo plano.
 * Solo se monta con sesión iniciada.
 */
export default function IdleGuard() {
  const { logout } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(null); // null = sin aviso
  const warningRef = useRef(false);

  useEffect(() => {
    writeLastActivity(Date.now());

    let lastWrite = 0;
    function touch() {
      // Durante el aviso solo el botón "Seguir conectado" renueva la sesión.
      if (warningRef.current) return;
      const now = Date.now();
      if (now - lastWrite > 1000) {
        lastWrite = now;
        writeLastActivity(now);
      }
    }

    function check() {
      const idle = Date.now() - readLastActivity(Date.now());
      if (idle >= IDLE_LIMIT_MS) {
        markIdleLogout();
        logout();
        return;
      }
      const remaining = IDLE_LIMIT_MS - idle;
      if (remaining <= IDLE_WARNING_MS) {
        warningRef.current = true;
        setSecondsLeft(Math.ceil(remaining / 1000));
      } else if (warningRef.current) {
        // Otra pestaña registró actividad: se cancela el aviso.
        warningRef.current = false;
        setSecondsLeft(null);
      }
    }

    const interval = setInterval(check, 1000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, touch));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [logout]);

  function stayConnected() {
    warningRef.current = false;
    writeLastActivity(Date.now());
    setSecondsLeft(null);
  }

  if (secondsLeft === null) return null;

  return (
    <Modal
      title="¿Sigues ahí?"
      subtitle="Por seguridad, tu sesión se cerrará por inactividad."
      icon={<IconClock />}
      onClose={stayConnected}
      width={400}
      footer={
        <>
          <button type="button" className="btn-outline" onClick={logout}>
            Cerrar sesión
          </button>
          <button type="button" className="btn-primary" onClick={stayConnected} autoFocus>
            Seguir conectado
          </button>
        </>
      }
    >
      <p className="idle-count" role="timer" aria-live="polite">
        Se cerrará en <b>{secondsLeft}</b> segundo{secondsLeft === 1 ? '' : 's'}.
      </p>
    </Modal>
  );
}
