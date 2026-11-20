import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { refreshSession } from '../../services/api.js';
import { setSessionExpiredHandler } from '../../services/session.js';
import * as authService from './services/auth.service.js';

const AuthContext = createContext(null);

// status: 'loading' (recuperando sesión) | 'authenticated' | 'anonymous'
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  // Al abrir o recargar la página se intenta recuperar la sesión con la cookie de renovación.
  useEffect(() => {
    let cancelled = false;
    refreshSession()
      .then((data) => !cancelled && setState({ status: 'authenticated', user: data.user }))
      .catch(() => !cancelled && setState({ status: 'anonymous', user: null }));
    return () => {
      cancelled = true;
    };
  }, []);

  // Si la renovación falla en medio de una petición, la sesión terminó.
  useEffect(() => {
    setSessionExpiredHandler(() => setState({ status: 'anonymous', user: null }));
    return () => setSessionExpiredHandler(() => {});
  }, []);

  // Devuelve { requires2fa, challengeToken } si falta el código; si no, abre la sesión.
  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    if (result.requires2fa) return result;
    setState({ status: 'authenticated', user: result });
    return result;
  }, []);

  const loginWithCode = useCallback(async (payload) => {
    const user = await authService.loginWithCode(payload);
    setState({ status: 'authenticated', user });
    return user;
  }, []);

  // Vuelve a pedir los datos del usuario (p. ej. tras activar o desactivar el 2FA).
  const reloadUser = useCallback(async () => {
    const user = await authService.getMe();
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setState({ status: 'anonymous', user: null });
  }, []);

  const changePassword = useCallback(async (payload) => {
    const user = await authService.changeMyPassword(payload);
    setState({ status: 'authenticated', user });
  }, []);

  const value = useMemo(
    () => ({ ...state, login, loginWithCode, logout, changePassword, reloadUser }),
    [state, login, loginWithCode, logout, changePassword, reloadUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
