'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import PageHeader from '@/components/admin/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteProductionOrder,
  useProductionOrder,
  useUpdateProductionOrderStatus,
} from '@/hooks/useProductionOrders';
import { toast } from '@/hooks/useToast';
import {
  PRODUCTION_ORDER_STATUSES,
  productionOrderStatusLabel,
  productionOrderStatusVariant,
} from '@/lib/productionOrders';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

function Metric({ label, value, className = '' }) {
  return (
    <div className={`rounded-lg border bg-muted/20 p-4 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function ProductionOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data, isLoading, error } = useProductionOrder(id);
  const updateStatus = useUpdateProductionOrderStatus();
  const deleteOrder = useDeleteProductionOrder();
  const order = data?.productionOrder;
  const matchingInvoices = data?.matchingInvoices ?? [];
  const invoiceRelationship = data?.invoiceRelationship ?? {
    state:
      matchingInvoices.length > 1 ? 'MULTIPLE' : matchingInvoices.length === 1 ? 'SINGLE' : 'NONE',
    matchCount: matchingInvoices.length,
    invoices: matchingInvoices,
  };
  const produced = order?.approvedQuantity ?? order?.producedQuantity ?? 0;
  const remaining = order ? Math.max(0, order.orderedQuantity - produced) : 0;
  const progress = order?.orderedQuantity
    ? Math.round((produced / order.orderedQuantity) * 100)
    : 0;

  async function handleStatusChange(status) {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: 'Production status updated' });
    } catch (requestError) {
      toast({ title: requestError.message ?? 'Could not update status', variant: 'destructive' });
    }
  }

  async function handleDelete() {
    try {
      await deleteOrder.mutateAsync(id);
      toast({ title: 'Production order deleted' });
      router.push('/production-orders');
    } catch (requestError) {
      toast({ title: requestError.message ?? 'Could not delete order', variant: 'destructive' });
    } finally {
      setDeleteOpen(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" /> {error?.message ?? 'Production order not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.poNumber}
        description={order.productionDescription}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/production-orders">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            <PermissionGuard anyOf={['production_entry.read_own', 'production_entry.read_all']}>
              <Button asChild variant="outline" size="sm">
                <Link href="/production-entries">
                  <ClipboardCheck className="h-4 w-4" /> Production History
                </Link>
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="production_order.update">
              <Button asChild variant="outline" size="sm">
                <Link href={`/production-orders/${id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="production_order.delete">
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={productionOrderStatusVariant(order.status)}>
          {productionOrderStatusLabel(order.status)}
        </Badge>
        <PermissionGuard permission="production_order.update">
          <Select
            value={order.status}
            onValueChange={handleStatusChange}
            disabled={updateStatus.isPending}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTION_ORDER_STATUSES.map((status) => (
                <SelectItem
                  key={status}
                  value={status}
                  disabled={status === 'COMPLETED' && remaining > 0}
                >
                  {productionOrderStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PermissionGuard>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Ordered" value={order.orderedQuantity} />
        <Metric label="Produced" value={produced} />
        <Metric label="Remaining" value={remaining} />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Production progress</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{order.client?.name ?? 'Unknown client'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Catalogue product</p>
              <p className="font-medium">{order.product?.name ?? 'Custom production'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Worker rate per unit</p>
              <p className="font-medium">{formatCurrency(order.workerRate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Planned worker cost</p>
              <p className="font-medium">
                {formatCurrency(order.workerRate * order.orderedQuantity)}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Start date</p>
                <p className="font-medium">{formatDate(order.startDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Due date</p>
                <p className="font-medium">{formatDate(order.dueDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 sm:col-span-2">
              <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created by</p>
                <p className="font-medium">
                  {order.createdBy?.username ?? order.createdBy?.email ?? 'Unknown'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {order.notes || 'No additional notes for this production order.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <PermissionGuard permission="invoice.read">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Related Invoices</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Exact PO-number matches for {order.poNumber}
              </p>
            </div>
            <Badge
              variant={
                invoiceRelationship.state === 'MULTIPLE'
                  ? 'warning'
                  : invoiceRelationship.state === 'SINGLE'
                    ? 'success'
                    : 'secondary'
              }
            >
              {invoiceRelationship.state === 'NONE'
                ? 'No invoice'
                : invoiceRelationship.state === 'SINGLE'
                  ? '1 match'
                  : `${invoiceRelationship.matchCount} possible matches`}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoiceRelationship.state === 'NONE' ? (
              <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
                <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">No matching invoice yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Production can continue normally without an invoice.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {invoiceRelationship.state === 'MULTIPLE' && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Multiple invoices use this PO number. Review each match; the system does not
                    assume that any single invoice owns this Production Order.
                  </div>
                )}
                {matchingInvoices.map((invoice) => (
                  <Link
                    key={invoice._id}
                    href={`/invoices/${invoice._id}`}
                    className="flex flex-col gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4" /> Invoice {invoice.invoiceNumber}
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(invoice.date)}</span>
                      <span>{formatCurrency(invoice.totalAmount ?? 0)}</span>
                      <Badge
                        variant={
                          invoice.status === 'Paid'
                            ? 'success'
                            : invoice.status === 'Pending'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </span>
                  </Link>
                ))}
              </>
            )}
            <p className="text-xs text-muted-foreground">
              This relationship is calculated from the PO number only. Invoice creation, editing,
              deletion, and payment status remain independent from production.
            </p>
          </CardContent>
        </Card>
      </PermissionGuard>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteOrder.isPending}
        title="Delete production order?"
        description="Only orders without approved production can be deleted. This does not delete any invoice."
      />
    </div>
  );
}
