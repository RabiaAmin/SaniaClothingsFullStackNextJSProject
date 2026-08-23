'use client';

import { useQuery } from '@tanstack/react-query';
import payrollApi from '@/lib/api/payroll.api';

export const PAYROLL_KEYS = {
  all: ['payroll'],
  monthly: (params) => ['payroll', 'monthly', params ?? {}],
};

export function useMonthlyPayroll(params, options = {}) {
  return useQuery({
    queryKey: PAYROLL_KEYS.monthly(params),
    queryFn: () => payrollApi.getMonthlyPayroll(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}
