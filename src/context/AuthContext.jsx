'use client';

import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import authApi from '@/lib/api/auth.api';
import { isProtectedPath } from '@/lib/auth/access';
import {
  hasPermission as userHasPermission,
  hasAnyPermission as userHasAnyPermission,
} from '@/lib/auth/permissions';

export const AuthContext = createContext(null);

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
    const authenticatedUser = res.data?.user ?? res.data;
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    setUser(res.data?.user ?? res.data);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  }, []);

  const permissions = useMemo(
    () => user?.permissions ?? user?.role?.permissions ?? [],
    [user?.permissions, user?.role?.permissions]
  );
  const hasPermission = useCallback(
    (permission) => userHasPermission(permissions, permission),
    [permissions]
  );
  const hasAnyPermission = useCallback(
    (requiredPermissions) => userHasAnyPermission(permissions, requiredPermissions),
    [permissions]
  );

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
        permissions,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
