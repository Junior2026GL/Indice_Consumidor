import { useEffect, useState } from 'react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

// iPhone/iPad no ofrecen botón de instalación: hay que explicar los pasos de Safari.
const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Botón "Instalar App": usa el aviso nativo (Android/Chrome/Edge) o muestra los pasos en iOS. */
export function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = isIos();

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault(); // guardamos el aviso para lanzarlo al tocar el botón
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!promptEvent && !ios)) return null;

  async function install() {
    if (!promptEvent) {
      setShowIosHelp((v) => !v);
      return;
    }
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null); // el aviso solo se puede usar una vez
  }

  return (
    <div className="install-app">
      <div className="install-app-sep">o</div>
      <button type="button" className="install-app-btn" onClick={install}>
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12m0 0-4-4m4 4 4-4" />
          <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        </svg>
        Instalar App en tu dispositivo
      </button>
      {showIosHelp && (
        <p className="install-app-help">
          En Safari toca <b>Compartir</b> (el cuadro con la flecha hacia arriba) y luego{' '}
          <b>Agregar a pantalla de inicio</b>.
        </p>
      )}
    </div>
  );
}
