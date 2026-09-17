'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useGenerateStatements, useStatementInvoices } from '@/hooks/useInvoices';
import { toast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import EmptyState from '@/components/admin/EmptyState';
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
import { ArrowLeft, FileBarChart, FileText, Loader2, Eye } from 'lucide-react';

const PAGE_SIZE = 40;

function statementViewHref(statement, invoiceIds) {
  const params = new URLSearchParams({ client: statement._id });
  invoiceIds.forEach((id) => params.append('invoiceId', id));
  return `/invoices/statements/view?${params.toString()}`;
}

export default function StatementsPage() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [generated, setGenerated] = useState(null);
  const { data, isLoading, error } = useStatementInvoices({ page, limit: PAGE_SIZE });
  const generateMutation = useGenerateStatements();

  const invoices = data?.invoices ?? [];
  const totalPages = data?.totalPages ?? 1;
  const displayedIds = useMemo(() => invoices.map((invoice) => invoice._id), [invoices]);
  const allDisplayedSelected =
    displayedIds.length > 0 && displayedIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function updateSelection(updater) {
    setSelectedIds((current) => {
      const next = new Set(current);
      updater(next);
      return next;
    });
    setGenerated(null);
  }

  function toggleInvoice(id) {
    updateSelection((next) => {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    });
  }

  function toggleDisplayed() {
    updateSelection((next) => {
      if (allDisplayedSelected) displayedIds.forEach((id) => next.delete(id));
      else displayedIds.forEach((id) => next.add(id));
    });
  }

  async function generateStatement() {
    if (!selectedCount) {
      toast({ title: 'Select at least one invoice', variant: 'destructive' });
      return;
    }

    try {
      const result = await generateMutation.mutateAsync([...selectedIds]);
      setGenerated({ ...result, invoiceIds: [...selectedIds] });
    } catch (err) {
      setGenerated(null);
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Statement generation failed',
        variant: 'destructive',
      });
    }
  }

  const statements = generated?.statements ?? [];
  const grandTotal = statements.reduce((sum, statement) => sum + (statement.totalAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Statements"
        description="Select Sent invoices to include in a statement"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/invoices">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

         {generated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated statements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement._id}>
                      <TableCell className="font-semibold">{statement._id}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        {statement.totalInvoices}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(statement.totalAmount ?? 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <a href={statementViewHref(statement, generated.invoiceIds)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t px-6 py-4 text-sm font-bold">
                Grand Total: {formatCurrency(grandTotal)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Choose invoices</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCount} {selectedCount === 1 ? 'invoice' : 'invoices'} selected
            </p>
          </div>
          <Button
            size="sm"
            onClick={generateStatement}
            disabled={selectedCount === 0 || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileBarChart className="h-4 w-4" />
            )}
            Generate Statement
          </Button>
        </CardHeader>

        {isLoading ? (
          <CardContent className="p-6 pt-0">
            <TableSkeleton rows={6} cols={7} />
          </CardContent>
        ) : error ? (
          <CardContent className="text-sm text-destructive">
            {error?.response?.data?.message ?? error?.message ?? 'Failed to load invoices'}
          </CardContent>
        ) : invoices.length === 0 ? (
          <CardContent className="p-0">
            <EmptyState
              icon={FileText}
              title="No invoices available"
              description="There are no Sent invoices available for statement generation."
              className="m-6"
            />
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        aria-label="Select all invoices on this page"
                        checked={allDisplayedSelected}
                        onChange={toggleDisplayed}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice._id}
                      data-state={selectedIds.has(invoice._id) ? 'selected' : undefined}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select invoice ${invoice.invoiceNumber ?? invoice._id}`}
                          checked={selectedIds.has(invoice._id)}
                          onChange={() => toggleInvoice(invoice._id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {invoice.invoiceNumber ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.poNumber ?? '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {invoice.date ? formatDate(invoice.date) : '—'}
                      </TableCell>
                      <TableCell>{invoice.toClient?.name ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(invoice.totalAmount ?? 0)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {invoice.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}

   
    </div>
  );
}
