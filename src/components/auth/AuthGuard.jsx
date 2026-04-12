'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Still fetching the current user
  if (isLoading) {
    return <PageSpinner />;
  }

  // Not authenticated — render nothing while the redirect fires
  if (!isAuthenticated) {
    return null;
  }

  return children;
}
