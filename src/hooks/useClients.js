'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clientApi from '@/lib/api/client.api';

export const CLIENT_KEYS = {
  all: ['clients'],
  list: () => ['clients', 'list'],
  detail: (id) => ['clients', 'detail', id],
};

export function useClients(options = {}) {
  return useQuery({
    queryKey: CLIENT_KEYS.list(),
    queryFn: () => clientApi.getAllClients().then((r) => r.data),
    staleTime: 60_000,
    enabled: options.enabled ?? true,
  });
}

export function useClient(id) {
  return useQuery({
    queryKey: CLIENT_KEYS.detail(id),
    queryFn: () => clientApi.getClientById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAddClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => clientApi.addClient(payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => clientApi.updateClient(id, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => clientApi.deleteClient(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENT_KEYS.all }),
  });
}
