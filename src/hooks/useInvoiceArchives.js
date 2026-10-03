'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import invoiceArchiveApi from '@/lib/api/invoiceArchive.api';

export const ARCHIVE_KEYS = {
  all: ['invoice-archives'],
  drive: ['invoice-archives', 'drive'],
  eligible: (params) => ['invoice-archives', 'eligible', params],
  jobs: (params) => ['invoice-archives', 'jobs', params],
};

export function useDriveStatus(options = {}) {
  return useQuery({
    queryKey: ARCHIVE_KEYS.drive,
    queryFn: () => invoiceArchiveApi.getDriveStatus().then((response) => response.data),
    enabled: options.enabled ?? true,
    retry: false,
  });
}

export function useEligibleInvoices(params = {}, options = {}) {
  return useQuery({
    queryKey: ARCHIVE_KEYS.eligible(params),
    queryFn: () => invoiceArchiveApi.getEligible(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}

export function useArchiveJobs(params = {}, options = {}) {
  return useQuery({
    queryKey: ARCHIVE_KEYS.jobs(params),
    queryFn: () => invoiceArchiveApi.getJobs(params).then((response) => response.data),
    enabled: options.enabled ?? true,
  });
}

export function useConnectDrive() {
  return useMutation({
    mutationFn: () => invoiceArchiveApi.connectDrive().then((response) => response.data),
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
  });
}

export function useDisconnectDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => invoiceArchiveApi.disconnectDrive().then((response) => response.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ARCHIVE_KEYS.drive }),
  });
}

export function useCreateInvoiceArchive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      invoiceArchiveApi.createArchive(crypto.randomUUID()).then((response) => response.data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ARCHIVE_KEYS.all }),
  });
}

export function useConfirmArchiveDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archiveId }) =>
      invoiceArchiveApi.confirmDeletion(id, archiveId).then((response) => response.data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ARCHIVE_KEYS.all }),
  });
}
