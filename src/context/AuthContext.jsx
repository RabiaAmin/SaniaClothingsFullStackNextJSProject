'use client';

import { createContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import authApi from '@/lib/api/auth.api';

export const AuthContext = createContext(null);

const PROTECTED_PATHS = [
  '/admin',
  '/dashboard',
  '/invoices',
  '/clients',
  '/business',
  '/bank-accounts',
  '/password',
];

function isProtectedPath(pathname) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const isProtected = isProtectedPath(pathname);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(isProtected);
  const [checkedPath, setCheckedPath] = useState(isProtected ? null : pathname);

  useEffect(() => {
    if (!isProtected) {
      setIsLoading(false);
      setCheckedPath(pathname);
      return;
    }

    setIsLoading(true);
    setCheckedPath(null);
    authApi
      .getMe()
      .then((res) => {
        setUser(res.data?.user ?? res.data);
      })
      .catch(() => setUser(null))
      .finally(() => {
        setCheckedPath(pathname);
        setIsLoading(false);
      });
  }, [isProtected, pathname]);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    setUser(res.data?.user ?? res.data);
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    setUser(res.data?.user ?? res.data);
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
        isLoading: isProtected && (isLoading || checkedPath !== pathname),
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
