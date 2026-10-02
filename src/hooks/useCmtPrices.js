'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import cmtPriceApi from '@/lib/api/cmtPrice.api';

export const CMT_PRICE_KEYS = { all: ['cmt-prices'], list: ['cmt-prices', 'list'] };

export function useCmtPrices() {
  return useQuery({
    queryKey: CMT_PRICE_KEYS.list,
    queryFn: () => cmtPriceApi.getCmtPrices().then((response) => response.data),
  });
}

export function useCmtPriceLookup() {
  return useMutation({
    mutationFn: ({ itemCode, usage }) =>
      cmtPriceApi.lookupPrice(itemCode, usage).then((response) => response.data.price),
  });
}

function mutation(method) {
  return function useCmtPriceMutation() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: method,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: CMT_PRICE_KEYS.all }),
    });
  };
}

export const useCreateCmtPrice = mutation((payload) =>
  cmtPriceApi.createCmtPrice(payload).then((response) => response.data)
);
export const useUpdateCmtPrice = mutation(({ id, payload }) =>
  cmtPriceApi.updateCmtPrice(id, payload).then((response) => response.data)
);
export const useDeleteCmtPrice = mutation((id) =>
  cmtPriceApi.deleteCmtPrice(id).then((response) => response.data)
);
