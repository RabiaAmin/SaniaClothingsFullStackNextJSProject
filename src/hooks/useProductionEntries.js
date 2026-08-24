'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import productionEntryApi from '@/lib/api/productionEntry.api';
import { PRODUCTION_ORDER_KEYS } from '@/hooks/useProductionOrders';

export const PRODUCTION_ENTRY_KEYS = {
  all: ['production-entries'],
  list: (params) => ['production-entries', 'list', params ?? {}],
  detail: (id) => ['production-entries', 'detail', id],
};

export function useProductionEntries(params, options = {}) {
  return useQuery({
    queryKey: PRODUCTION_ENTRY_KEYS.list(params),
    queryFn: () =>
      productionEntryApi.getProductionEntries(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}

export function useProductionEntry(id) {
  return useQuery({
    queryKey: PRODUCTION_ENTRY_KEYS.detail(id),
    queryFn: () => productionEntryApi.getProductionEntry(id).then((response) => response.data),
    enabled: Boolean(id),
  });
}

function invalidateProduction(queryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: PRODUCTION_ENTRY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: PRODUCTION_ORDER_KEYS.all }),
  ]);
}

function useEntryMutation(mutationFn) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateProduction(queryClient),
  });
}

export function useCreateProductionEntry() {
  return useEntryMutation((payload) =>
    productionEntryApi.createProductionEntry(payload).then((response) => response.data)
  );
}

export function useUpdateProductionEntry() {
  return useEntryMutation(({ id, payload }) =>
    productionEntryApi.updateProductionEntry(id, payload).then((response) => response.data)
  );
}

export function useApproveProductionEntry() {
  return useEntryMutation(({ id, reviewNotes }) =>
    productionEntryApi.approveProductionEntry(id, reviewNotes).then((response) => response.data)
  );
}

export function useRejectProductionEntry() {
  return useEntryMutation(({ id, reviewNotes }) =>
    productionEntryApi.rejectProductionEntry(id, reviewNotes).then((response) => response.data)
  );
}
