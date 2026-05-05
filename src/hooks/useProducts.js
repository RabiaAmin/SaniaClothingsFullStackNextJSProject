'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productApi from '@/lib/api/product.api';

export const PRODUCT_KEYS = {
  all: ['products'],
  list: (params) => ['products', 'list', params ?? {}],
  detail: (id) => ['products', 'detail', id],
};

export function useProducts(params) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => productApi.getProducts(params).then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: PRODUCT_KEYS.detail(id),
    queryFn: () => productApi.getProductById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => productApi.createProduct(payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => productApi.updateProduct(id, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => productApi.deleteProduct(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
  });
}
