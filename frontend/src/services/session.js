// El token de acceso vive solo en memoria: no está en localStorage, así que un
// script malicioso (XSS) no puede leerlo ni llevárselo. La sesión se recupera al
// recargar la página con la cookie HttpOnly de renovación (ver auth.service.js).
let accessToken = null;
let onSessionExpired = () => {};

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token || null;
};

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

export function notifySessionExpired() {
  accessToken = null;
  onSessionExpired();
}
