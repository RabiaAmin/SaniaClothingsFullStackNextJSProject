'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import productionOrderApi from '@/lib/api/productionOrder.api';

export const PRODUCTION_ORDER_KEYS = {
  all: ['production-orders'],
  list: (params) => ['production-orders', 'list', params ?? {}],
  detail: (id) => ['production-orders', 'detail', id],
};

export function useProductionOrders(params, options = {}) {
  return useQuery({
    queryKey: PRODUCTION_ORDER_KEYS.list(params),
    queryFn: () => productionOrderApi.getProductionOrders(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}

export function useProductionOrder(id) {
  return useQuery({
    queryKey: PRODUCTION_ORDER_KEYS.detail(id),
    queryFn: () => productionOrderApi.getProductionOrder(id).then((response) => response.data),
    enabled: Boolean(id),
  });
}

function invalidateProductionOrders(queryClient) {
  return queryClient.invalidateQueries({ queryKey: PRODUCTION_ORDER_KEYS.all });
}

export function useCreateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      productionOrderApi.createProductionOrder(payload).then((response) => response.data),
    onSuccess: () => invalidateProductionOrders(queryClient),
  });
}

export function useUpdateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      productionOrderApi.updateProductionOrder(id, payload).then((response) => response.data),
    onSuccess: () => invalidateProductionOrders(queryClient),
  });
}

export function useUpdateProductionOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) =>
      productionOrderApi.updateStatus(id, status).then((response) => response.data),
    onSuccess: () => invalidateProductionOrders(queryClient),
  });
}

export function useDeleteProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      productionOrderApi.deleteProductionOrder(id).then((response) => response.data),
    onSuccess: () => invalidateProductionOrders(queryClient),
  });
}
