import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api.js';

/** @typedef {{ id: string, email?: string, name?: string, firstName?: string, lastName?: string, role?: string, avatar?: string, pushEnabled?: boolean, emailEnabled?: boolean }} AuthUser */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  /** @type {[AuthUser | null, import('react').Dispatch<import('react').SetStateAction<AuthUser | null>>]} */
  const [user, setUser] = useState(null);
  /** Bez tokenu od razu „gotowe”; z tokenem czekamy na `/me`. */
  const [loading, setLoading] = useState(() => Boolean(getStoredToken()));

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest('/api/auth/me');
      setUser(data?.user ?? null);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser: loadUser,
      logout,
    }),
    [user, loading, loadUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth musi być używany wewnątrz AuthProvider');
  }
  return ctx;
}
