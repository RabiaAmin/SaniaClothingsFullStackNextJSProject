'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  HardDrive,
  Loader2,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import TableSkeleton from '@/components/admin/TableSkeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/useToast';
import {
  useArchiveJobs,
  useConfirmArchiveDeletion,
  useConnectDrive,
  useCreateInvoiceArchive,
  useDisconnectDrive,
  useDriveStatus,
  useEligibleInvoices,
} from '@/hooks/useInvoiceArchives';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function statusVariant(status) {
  if (status === 'COMPLETED' || status === 'READY_FOR_CONFIRMATION') return 'success';
  if (status === 'FAILED') return 'destructive';
  return 'secondary';
}

export default function InvoiceArchivePage() {
  const [confirmJob, setConfirmJob] = useState(null);
  const driveQuery = useDriveStatus();
  const eligibleQuery = useEligibleInvoices({ page: 1, limit: 100 });
  const jobsQuery = useArchiveJobs({ page: 1, limit: 25 });
  const connect = useConnectDrive();
  const disconnect = useDisconnectDrive();
  const createArchive = useCreateInvoiceArchive();
  const confirmDeletion = useConfirmArchiveDeletion();
  const drive = driveQuery.data?.drive;
  const eligible = eligibleQuery.data;
  const jobs = jobsQuery.data?.jobs ?? [];

  async function handleCreateArchive() {
    try {
      const result = await createArchive.mutateAsync();
      toast({
        title: `Archive verified`,
        description: `${result.job.expectedInvoiceCount} invoices are ready for confirmation.`,
      });
    } catch (error) {
      toast({ title: errorMessage(error, 'Archive creation failed'), variant: 'destructive' });
    }
  }

  async function handleConfirmDeletion() {
    try {
      const result = await confirmDeletion.mutateAsync({
        id: confirmJob._id,
        archiveId: confirmJob.archiveId,
      });
      toast({ title: result.message });
      setConfirmJob(null);
    } catch (error) {
      toast({ title: errorMessage(error, 'Deletion failed'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice retention archive"
        description="Archive invoices to Google Drive, verify every file, then explicitly confirm database deletion."
        action={
          <Button asChild variant="outline">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" /> Invoices
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" /> Google Drive
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">
              {drive?.connected
                ? `Connected as ${drive.accountEmail || 'Google account'}`
                : 'Not connected'}
            </p>
            <p className="text-sm text-muted-foreground">
              {drive?.error ||
                'Archives use the app-only Drive permission and an encrypted offline refresh token.'}
            </p>
          </div>
          <div className="flex gap-2">
            {drive?.folderUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={drive.folderUrl} target="_blank" rel="noreferrer">
                  Folder <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
              {connect.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {drive?.connected ? 'Reconnect' : 'Connect Google Drive'}
            </Button>
            {drive?.connected && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unplug className="h-4 w-4" /> Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Archive className="h-4 w-4" />
        <AlertTitle>Rolling six-month cutoff</AlertTitle>
        <AlertDescription>
          {eligibleQuery.isLoading
            ? 'Calculating eligibility…'
            : `${eligible?.count ?? 0} invoices have a saved date strictly before ${eligible?.cutoff ? formatDate(eligible.cutoff) : 'the cutoff'}. Missing or invalid dates are excluded.`}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Eligible invoices</CardTitle>
          <Button
            onClick={handleCreateArchive}
            disabled={!drive?.connected || !eligible?.count || createArchive.isPending}
          >
            {createArchive.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {createArchive.isPending
              ? 'Generating, uploading, and verifying…'
              : 'Create verified archive'}
          </Button>
        </CardHeader>
        <CardContent>
          {eligibleQuery.isLoading ? (
            <TableSkeleton rows={5} columns={5} />
          ) : eligibleQuery.isError ? (
            <p className="text-sm text-destructive">
              {errorMessage(eligibleQuery.error, 'Unable to load eligible invoices')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(eligible?.invoices ?? []).map((invoice) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.toClient?.name || 'Unavailable'}</TableCell>
                    <TableCell>{formatDate(invoice.date)}</TableCell>
                    <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invoice.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!eligible?.invoices?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No invoices currently qualify.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archive history</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsQuery.isLoading ? (
            <TableSkeleton rows={4} columns={5} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Archive</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Verification / deletion</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell>{formatDate(job.createdAt)}</TableCell>
                    <TableCell className="max-w-64 break-all font-mono text-xs">
                      {job.archiveId}
                    </TableCell>
                    <TableCell>{job.expectedInvoiceCount}</TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <Badge variant={statusVariant(job.status)}>
                          {job.status.replaceAll('_', ' ')}
                        </Badge>
                        {job.verification?.allFilesMatched && (
                          <p className="flex items-center gap-1 text-xs text-green-700">
                            <CheckCircle2 className="h-3 w-3" /> All uploaded files verified
                          </p>
                        )}
                        {job.status === 'COMPLETED' && (
                          <p className="text-xs">
                            Deleted {job.deletedCount}; skipped {job.deletionSkipped?.length ?? 0}
                          </p>
                        )}
                        {job.error?.message && (
                          <p className="text-xs text-destructive">{job.error.message}</p>
                        )}
                        {['READY_FOR_CONFIRMATION', 'DELETING'].includes(job.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmJob(job)}
                          >
                            {job.status === 'DELETING'
                              ? 'Resume confirmed deletion'
                              : 'Confirm permanent deletion'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {job.driveFolderUrl ? (
                        <Button asChild variant="outline" size="sm">
                          <a href={job.driveFolderUrl} target="_blank" rel="noreferrer">
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!jobs.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No archive operations yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmJob)}
        onClose={() => setConfirmJob(null)}
        onConfirm={handleConfirmDeletion}
        loading={confirmDeletion.isPending}
        title="Permanently delete verified invoices?"
        description={`The backend will recheck every invoice and delete only unchanged, still-eligible records covered by ${confirmJob?.archiveId || 'this verified archive'}. This cannot be undone.`}
        confirmLabel="Permanently delete"
      />
    </div>
  );
}
