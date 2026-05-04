'use client';

import { useQuery } from '@tanstack/react-query';
import businessApi from '@/lib/api/business.api';

export const BUSINESS_KEYS = {
  all: ['business'],
  detail: () => ['business', 'detail'],
};

export function useBusiness() {
  const { data, isLoading, error } = useQuery({
    queryKey: BUSINESS_KEYS.detail(),
    queryFn: () => businessApi.getBusiness().then((r) => r.data.business),
    staleTime: 5 * 60_000,
  });

  return { business: data ?? null, isLoading, error };
}
