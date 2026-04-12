'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import authApi from '@/lib/api/auth.api';

/**
 * @typedef {Object} AuthContextValue
 * @property {import('@/types').User|null} user
 * @property {boolean}  isAuthenticated
 * @property {boolean}  isLoading
 * @property {(credentials: { email: string, password: string }) => Promise<void>} login
 * @property {() => Promise<void>} logout
 * @property {(user: import('@/types').User) => void} setUser
 */

/** @type {React.Context<AuthContextValue>} */
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate current user on mount (e.g. from a session cookie)
  useEffect(() => {
    authApi
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    setUser(res.data.user ?? res.data);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
