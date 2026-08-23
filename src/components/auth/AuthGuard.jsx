'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageSpinner } from '@/components/common/LoadingSpinner';

/**
 * Client-side route guard.
 *
 * Usage — wrap any layout that requires authentication:
 *   <AuthGuard>{children}</AuthGuard>
 *
 * While the initial getMe() call is in-flight, renders a full-page spinner.
 * Once resolved, unauthenticated users are redirected to /login.
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (
      !isLoading &&
      isAuthenticated &&
      user?.mustChangePassword &&
      pathname !== '/change-password'
    ) {
      router.replace('/change-password');
      return;
    }
    if (
      !isLoading &&
      isAuthenticated &&
      !user?.mustChangePassword &&
      pathname === '/change-password'
    ) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, pathname, router, user?.mustChangePassword]);

  // Still fetching the current user
  if (isLoading) {
    return <PageSpinner />;
  }

  // Not authenticated — render nothing while the redirect fires
  if (!isAuthenticated) {
    return null;
  }

  if (
    (user?.mustChangePassword && pathname !== '/change-password') ||
    (!user?.mustChangePassword && pathname === '/change-password')
  ) {
    return null;
  }

  return children;
}
