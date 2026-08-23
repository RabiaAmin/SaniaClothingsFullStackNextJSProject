'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import userAccessApi from '@/lib/api/userAccess.api';
import { ROLE_KEYS } from '@/hooks/useRoles';

export const USER_ACCESS_KEYS = { all: ['user-access'] };

export function useUsers() {
  return useQuery({
    queryKey: USER_ACCESS_KEYS.all,
    queryFn: () => userAccessApi.getUsers().then((response) => response.data),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => userAccessApi.createUser(payload).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ACCESS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.all });
    },
  });
}

export function useUpdateUserAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      userAccessApi.updateAccess(id, payload).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_ACCESS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.all });
    },
  });
}
