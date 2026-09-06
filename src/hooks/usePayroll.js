'use client';

import { useQuery } from '@tanstack/react-query';
import payrollApi from '@/lib/api/payroll.api';

export const PAYROLL_KEYS = {
  all: ['payroll'],
  range: (params) => ['payroll', 'range', params ?? {}],
  pdf: (params) => ['payroll', 'pdf', params ?? {}],
  monthly: (params) => ['payroll', 'monthly', params ?? {}],
};

export function usePayroll(params, options = {}) {
  return useQuery({
    queryKey: PAYROLL_KEYS.range(params),
    queryFn: () => payrollApi.getPayroll(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}

export function useMonthlyPayroll(params, options = {}) {
  return useQuery({
    queryKey: PAYROLL_KEYS.monthly(params),
    queryFn: () => payrollApi.getMonthlyPayroll(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}

export function usePayrollPdfData(params, options = {}) {
  return useQuery({
    queryKey: PAYROLL_KEYS.pdf(params),
    queryFn: () => payrollApi.getPayrollPdfData(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}
