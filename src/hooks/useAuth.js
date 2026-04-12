'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Convenience hook for consuming AuthContext.
 *
 * Usage:
 *   const { user, login, logout, isAuthenticated, isLoading } = useAuth();
 *
 * @returns {import('@/context/AuthContext').AuthContextValue}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
