'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import invoiceApi from '@/lib/api/invoice.api';

export const INVOICE_KEYS = {
  all: ['invoices'],
  list: (params) => ['invoices', 'list', params],
  detail: (id) => ['invoices', 'detail', id],
  statements: (params) => ['invoices', 'statements', params],
};

export function useInvoices(params = {}) {
  return useQuery({
    queryKey: INVOICE_KEYS.list(params),
    queryFn: () => invoiceApi.getAllInvoices(params).then((r) => r.data),
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: () => invoiceApi.getInvoiceById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useWeeklyStatements(params) {
  return useQuery({
    queryKey: INVOICE_KEYS.statements(params),
    queryFn: () => invoiceApi.getWeeklyStatements(params).then((r) => r.data),
    enabled: !!(params?.startDate && params?.endDate),
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => invoiceApi.createInvoice(payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICE_KEYS.all }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => invoiceApi.updateInvoice(id, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICE_KEYS.all }),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => invoiceApi.deleteInvoice(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICE_KEYS.all }),
  });
}

export function useMarkAsPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceIds) => invoiceApi.markAsPaid({ invoiceIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: INVOICE_KEYS.all }),
  });
}
