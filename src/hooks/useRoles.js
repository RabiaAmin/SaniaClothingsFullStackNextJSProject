'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import roleApi from '@/lib/api/role.api';

export const ROLE_KEYS = {
  all: ['roles'],
  list: ['roles', 'list'],
  permissions: ['roles', 'permissions'],
  users: (id) => ['roles', id, 'users'],
};

export function useRoles() {
  return useQuery({
    queryKey: ROLE_KEYS.list,
    queryFn: () => roleApi.getRoles().then((response) => response.data),
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ROLE_KEYS.permissions,
    queryFn: () => roleApi.getPermissions().then((response) => response.data),
    staleTime: 5 * 60_000,
  });
}

export function useRoleUsers(id) {
  return useQuery({
    queryKey: ROLE_KEYS.users(id),
    queryFn: () => roleApi.getRoleUsers(id).then((response) => response.data),
    enabled: Boolean(id),
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => roleApi.createRole(payload).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLE_KEYS.all }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      roleApi.updateRole(id, payload).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLE_KEYS.all }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => roleApi.deleteRole(id).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLE_KEYS.all }),
  });
}
