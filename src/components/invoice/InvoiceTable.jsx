'use client';

import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useUpdateInvoice } from '@/hooks/useInvoices';
import { toast } from '@/hooks/useToast';
import TableSkeleton from '@/components/admin/TableSkeleton';
import EmptyState from '@/components/admin/EmptyState';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Eye, Pencil, Trash2, MoreHorizontal, FileText, Plus, Loader2, ChevronDown } from 'lucide-react';

const STATUSES = ['Pending', 'Sent', 'Paid'];

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
};

function StatusSelect({ invoice }) {
  const updateMutation = useUpdateInvoice();
  const status = invoice.status;
  const key = status?.toLowerCase() ?? 'pending';
  const classes = STATUS_STYLES[key] ?? 'bg-muted text-muted-foreground border-border';

  async function changeStatus(newStatus) {
    if (newStatus === status) return;
    try {
      await updateMutation.mutateAsync({
        id: invoice._id,
        payload: {
          invoiceNumber: invoice.invoiceNumber,
          fromBusiness: invoice.fromBusiness?._id ?? invoice.fromBusiness,
          toClient: invoice.toClient?._id ?? invoice.toClient,
          items: invoice.items,
          subTotal: invoice.subTotal,
          totalAmount: invoice.totalAmount,
          category: invoice.category,
          date: invoice.date,
          poNumber: invoice.poNumber,
          tax: invoice.tax,
          status: newStatus,
        },
      });
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Status update failed',
        variant: 'destructive',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-opacity disabled:opacity-50',
            classes
          )}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {status ?? 'Pending'}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => changeStatus(s)}
            className={s === status ? 'font-semibold' : ''}
          >
            {s}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function InvoiceTable({
  invoices = [],
  isLoading,
  error,
  deletingId,
  onDelete,
  onCreate,
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <TableSkeleton rows={6} cols={5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {error?.message ?? error}
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description="Create your first invoice to get started."
            action={
              onCreate && (
                <Button onClick={onCreate}>
                  <Plus className="h-4 w-4" /> New Invoice
                </Button>
              )
            }
            className="m-6"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv._id}>
                <TableCell className="text-sm text-muted-foreground">
                  {inv.poNumber ?? '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {inv.date ? formatDate(inv.date) : '—'}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(inv.totalAmount ?? 0)}
                </TableCell>
                <TableCell>
                  <StatusSelect invoice={inv} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/invoices/${inv._id}`}>
                          <Eye className="h-4 w-4" /> View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/invoices/${inv._id}/edit`}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(inv._id)}
                        disabled={deletingId === inv._id}
                      >
                        {deletingId === inv._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
