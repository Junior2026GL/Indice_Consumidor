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

  const login = useCallback(async (credentials) => {
    const user = await authService.login(credentials);
    setState({ status: 'authenticated', user });
    return user;
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
    () => ({ ...state, login, logout, changePassword }),
    [state, login, logout, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
