'use client';

import { useAuth } from '@/hooks/useAuth';

export default function PermissionGuard({ permission, anyOf, fallback = null, children }) {
  const { hasPermission, hasAnyPermission } = useAuth();
  const allowed = permission ? hasPermission(permission) : hasAnyPermission(anyOf || []);
  return allowed ? children : fallback;
}
