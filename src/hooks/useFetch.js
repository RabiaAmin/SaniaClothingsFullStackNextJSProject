'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data-fetching hook that wraps any async API call.
 *
 * @template T
 * @param {() => Promise<import('axios').AxiosResponse<T>>} fetchFn
 *   An axios call, e.g. `() => invoiceApi.getInvoices({ page: 1 })`
 * @param {{ immediate?: boolean, deps?: any[] }} [options]
 *
 * @example
 * const { data, isLoading, error, refetch } = useFetch(
 *   () => invoiceApi.getInvoices(),
 *   { immediate: true }
 * );
 */
export function useFetch(fetchFn, { immediate = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Keep a stable ref to avoid stale closure issues
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchRef.current();
      setData(response.data);
    } catch (err) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, ...deps]);

  return { data, isLoading, error, refetch: execute };
}
