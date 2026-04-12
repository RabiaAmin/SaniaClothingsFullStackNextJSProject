'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import authApi from '@/lib/api/auth.api';

/**
 * @typedef {Object} AuthContextValue
 * @property {import('@/types').User|null} user
 * @property {boolean} isAuthenticated
 * @property {boolean} isLoading          – true only during the initial getMe() call
 * @property {(credentials: { email: string, password: string }) => Promise<void>} login
 * @property {(payload: { firstName: string, lastName: string, email: string, password: string }) => Promise<void>} register
 * @property {() => Promise<void>} logout
 * @property {(user: import('@/types').User) => void} setUser
 */

/** @type {React.Context<AuthContextValue>} */
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Hydrate on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => {
        // Normalize: backends may return { user: {...} } or the user object directly
        setUser(res.data?.user ?? res.data);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Login and hydrate user from the response.
   * Throws on failure so the calling component can display the error.
   */
  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    setUser(res.data?.user ?? res.data);
  }, []);

  /**
   * Register a new account and auto-login by hydrating user state.
   * Throws on failure so the calling component can display the error.
   */
  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    setUser(res.data?.user ?? res.data);
  }, []);

  /**
   * Logout — calls the server to invalidate the HttpOnly cookie,
   * then clears local state.
   */
  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {
      // Server may already have cleared the cookie; clear local state anyway
    });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
