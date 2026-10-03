'use client';

import Link from 'next/link';
import { Archive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useDriveStatus, useEligibleInvoices } from '@/hooks/useInvoiceArchives';
import { formatDate } from '@/lib/utils/formatters';

export default function InvoiceArchiveAlert() {
  const eligible = useEligibleInvoices({ page: 1, limit: 1 });
  const drive = useDriveStatus();
  if (eligible.isLoading || eligible.isError || !eligible.data?.count) return null;
  return (
    <Alert variant="warning">
      <Archive className="h-4 w-4" />
      <AlertTitle>Invoice retention review</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {eligible.data.count} invoice{eligible.data.count === 1 ? '' : 's'} dated before{' '}
          {formatDate(eligible.data.cutoff)} can be archived. Google Drive is{' '}
          {drive.data?.drive?.connected ? 'connected' : 'not connected'}.
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href="/invoices/archive">Review old invoices</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
