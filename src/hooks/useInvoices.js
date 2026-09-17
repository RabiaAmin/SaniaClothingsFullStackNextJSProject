'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import invoiceApi from '@/lib/api/invoice.api';

export const INVOICE_KEYS = {
  all: ['invoices'],
  list: (params) => ['invoices', 'list', params],
  detail: (id) => ['invoices', 'detail', id],
  statementInvoices: (params) => ['invoices', 'statement-invoices', params],
  statements: (invoiceIds) => ['invoices', 'statements', invoiceIds],
  statementHistory: () => ['invoices', 'statement-history'],
  statementHistoryList: (params) => ['invoices', 'statement-history', 'list', params],
  statementHistoryDetail: (id) => ['invoices', 'statement-history', 'detail', id],
};

export function useInvoices(params = {}, options = {}) {
  return useQuery({
    queryKey: INVOICE_KEYS.list(params),
    queryFn: () => invoiceApi.getAllInvoices(params).then((r) => r.data),
    enabled: options.enabled ?? true,
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: INVOICE_KEYS.detail(id),
    queryFn: () => invoiceApi.getInvoiceById(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useStatementInvoices(params = {}) {
  return useQuery({
    queryKey: INVOICE_KEYS.statementInvoices(params),
    queryFn: () => invoiceApi.getStatementInvoices(params).then((r) => r.data),
  });
}

export function useGeneratedStatements(invoiceIds) {
  return useQuery({
    queryKey: INVOICE_KEYS.statements(invoiceIds),
    queryFn: () => invoiceApi.generateStatements({ invoiceIds }).then((r) => r.data),
    enabled: invoiceIds.length > 0,
    retry: false,
  });
}

export function useGenerateStatements() {
  return useMutation({
    mutationFn: (invoiceIds) => invoiceApi.generateStatements({ invoiceIds }).then((r) => r.data),
  });
}

export function useStatementHistory(params = {}) {
  return useQuery({
    queryKey: INVOICE_KEYS.statementHistoryList(params),
    queryFn: () => invoiceApi.getStatementHistory(params).then((response) => response.data),
  });
}

export function useStatementHistoryItem(id) {
  return useQuery({
    queryKey: INVOICE_KEYS.statementHistoryDetail(id),
    queryFn: () => invoiceApi.getStatementHistoryById(id).then((response) => response.data),
    enabled: !!id,
    retry: false,
  });
}

export function useCreateStatementHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceIds, pdfBlob, filename }) => {
      const formData = new FormData();
      formData.append('invoiceIds', JSON.stringify(invoiceIds));
      formData.append('pdf', pdfBlob, filename);
      return invoiceApi.createStatementHistory(formData).then((response) => response.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.statementHistory() }),
  });
}

export function useDeleteStatementHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => invoiceApi.deleteStatementHistory(id).then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICE_KEYS.statementHistory() }),
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
