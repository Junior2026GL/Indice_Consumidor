// Tiempos del cierre de sesión por inactividad.
export const IDLE_LIMIT_MS = 10 * 60_000; // sin tocar la app durante 10 minutos
export const IDLE_WARNING_MS = 60_000; // aviso con cuenta regresiva el último minuto

const NOTICE_KEY = 'ipc_idle_logout';
const ACTIVITY_KEY = 'ipc_last_activity';

// sessionStorage / localStorage pueden fallar (modo privado, datos bloqueados): nunca deben romper la app.
function safe(action) {
  try {
    return action();
  } catch {
    return null;
  }
}

/** Deja constancia de que el cierre fue por inactividad, para avisarlo en el login. */
export function markIdleLogout() {
  safe(() => sessionStorage.setItem(NOTICE_KEY, '1'));
}

/** Devuelve true una sola vez si la sesión anterior se cerró por inactividad. */
export function takeIdleLogoutNotice() {
  const pending = safe(() => sessionStorage.getItem(NOTICE_KEY)) === '1';
  if (pending) safe(() => sessionStorage.removeItem(NOTICE_KEY));
  return pending;
}

// La última actividad se comparte entre pestañas: usar una pestaña mantiene viva a las demás.
export function readLastActivity(fallback) {
  const value = Number(safe(() => localStorage.getItem(ACTIVITY_KEY)));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function writeLastActivity(timestamp) {
  safe(() => localStorage.setItem(ACTIVITY_KEY, String(timestamp)));
}
