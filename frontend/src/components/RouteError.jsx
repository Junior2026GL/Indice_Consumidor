import { useEffect } from 'react';
import { Link, useRouteError } from 'react-router-dom';

// Tras un nuevo despliegue, una pestaña abierta pide archivos con el nombre anterior (ya no existen).
const STALE_BUNDLE =
  /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch dynamically/i;
const RELOAD_KEY = 'ipc_reloaded_for_update';

function isStaleBundle(error) {
  return STALE_BUNDLE.test(String(error?.message ?? error ?? ''));
}

export default function RouteError() {
  const error = useRouteError();
  console.error(error);

  const stale = isStaleBundle(error);

  useEffect(() => {
    if (!stale) return;
    // Se recarga una sola vez (evita bucles si el problema es otro).
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, '1');
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  const detail = String(error?.message ?? error ?? '').slice(0, 300);

  return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <h2>No pudimos mostrar esta página</h2>
      <p>
        {stale
          ? 'Hay una versión nueva del sistema. Recarga la página para continuar.'
          : 'Ocurrió un error inesperado. Intenta de nuevo o vuelve al inicio.'}
      </p>
      {stale ? (
        <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
          Recargar
        </button>
      ) : (
        <Link className="btn-primary" to="/">
          Volver al inicio
        </Link>
      )}
      {detail && (
        <p style={{ marginTop: 20, fontSize: 12, color: '#667085', wordBreak: 'break-word' }}>
          Detalle técnico: {detail}
        </p>
      )}
    </div>
  );
}
