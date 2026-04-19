'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInvoices, useDeleteInvoice } from '@/hooks/useInvoices';
import { useClients } from '@/hooks/useClients';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import InvoiceTable from '@/components/invoice/InvoiceTable';
import InvoiceFilters from '@/components/invoice/InvoiceFilters';

import { Button } from '@/components/ui/button';
import { Plus, Send } from 'lucide-react';

export default function InvoicesPage() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    toClient: '',
    poNumber: '',
  });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = {
    page,
    limit: 40,
    ...(filters.startDate && { startDate: filters.startDate }),
    ...(filters.endDate && { endDate: filters.endDate }),
    ...(filters.toClient && { toClient: filters.toClient }),
    ...(filters.poNumber && { poNumber: filters.poNumber }),
  };

  const { data, isLoading, error } = useInvoices(queryParams);
  const { data: clientsData } = useClients();
  const deleteMutation = useDeleteInvoice();

  const invoices = data?.invoices ?? [];
  const totalPages = data?.totalPages ?? 1;
  const clients = clientsData?.clients ?? [];

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  async function handleDelete(id) {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Invoice deleted' });
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Manager"
        description="Create and manage your invoices"
        action={
          <Button asChild>
            <Link href="/invoices/create">
              <Plus className="h-4 w-4" /> New Invoice
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <InvoiceFilters filters={filters} onChange={handleFilterChange} clients={clients} />

      {/* Secondary actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.totalRecords != null ? `${data.totalRecords} invoices` : ''}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices/statements">
            <Send className="h-4 w-4" /> Statements
          </Link>
        </Button>
      </div>

      {/* Table */}
      <InvoiceTable
        invoices={invoices}
        isLoading={isLoading}
        error={error}
        deletingId={deleteMutation.isPending ? deleteTarget : null}
        onDelete={(id) => setDeleteTarget(id)}
        onCreate={null}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
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
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget)}
        loading={deleteMutation.isPending}
        title="Delete invoice?"
        description="This invoice will be permanently removed and cannot be undone."
      />
    </div>
  );
}
