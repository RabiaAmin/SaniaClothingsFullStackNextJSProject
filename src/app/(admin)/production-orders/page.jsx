'use client';

import { useDeferredValue, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
} from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import ProductionEntryFormDialog from '@/components/production/ProductionEntryFormDialog';
import { WorkerCardSkeleton, WorkerOrderCard } from '@/components/worker/WorkerMobileCards';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  PRODUCTION_ORDER_STATUSES,
  productionOrderProgressColor,
  productionOrderStatusLabel,
  productionOrderStatusVariant,
  productionOrderTracking,
} from '@/lib/productionOrders';

function ProgressSummary({ order }) {
  const tracking = productionOrderTracking(order);

  return (
    <div className="min-w-44 space-y-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${productionOrderProgressColor(order)}`}
          style={{ width: `${tracking.progressPercentage}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          {tracking.producedQuantity} / {tracking.orderedQuantity} produced
        </span>
        <span>{tracking.remainingQuantity} remaining</span>
      </div>
    </div>
  );
}

function DeadlineSummary({ order }) {
  const tracking = productionOrderTracking(order);
  if (!tracking.productionDeadline)
    return <span className="text-muted-foreground">Unavailable</span>;

  const warningClass =
    tracking.deadlineStatus === 'OVERDUE'
      ? 'text-destructive'
      : tracking.deadlineStatus === 'DUE_SOON'
        ? 'text-yellow-700 dark:text-yellow-300'
        : '';

  return (
    <div className={`space-y-1 ${warningClass}`}>
      <span className="flex items-center gap-1 font-medium">
        <Clock3 className="h-3.5 w-3.5" /> {formatDate(tracking.productionDeadline)}
      </span>
      {tracking.deadlineStatus === 'DUE_SOON' && <p className="text-xs">Due soon</p>}
      {tracking.deadlineStatus === 'OVERDUE' && <p className="text-xs">Overdue</p>}
    </div>
  );
}

function ProductionStatus({ order }) {
  const tracking = productionOrderTracking(order);
  return (
    <Badge variant={productionOrderStatusVariant(tracking.status)} className="gap-1">
      {tracking.status === 'COMPLETED' && <CheckCircle2 className="h-3.5 w-3.5" />}
      {productionOrderStatusLabel(tracking.status)}
    </Badge>
  );
}

function invoiceStatusVariant(status) {
  if (status === 'Paid') return 'success';
  if (status === 'Pending') return 'warning';
  return 'default';
}

function InvoiceRelationship({ relationship }) {
  if (!relationship || relationship.state === 'NONE') {
    return <Badge variant="secondary">No invoice</Badge>;
  }
  if (relationship.state === 'MULTIPLE') {
    return <Badge variant="warning">{relationship.matchCount} invoice matches</Badge>;
  }
  const invoice = relationship.latestInvoice;
  return (
    <div className="space-y-1">
      <Badge variant={invoiceStatusVariant(invoice?.status)}>{invoice?.status ?? 'Matched'}</Badge>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <FileText className="h-3 w-3" /> Invoice {invoice?.invoiceNumber ?? 'matched'}
      </p>
    </div>
  );
}

export default function ProductionOrdersPage() {
  const { user, hasPermission } = useAuth();
  const canReadInvoices = hasPermission('invoice.read');
  const isWorkerView =
    hasPermission('production_entry.read_own') && !hasPermission('production_entry.read_all');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const showWorkerMobile = isWorkerView && isMobile;
  const canRecordProduction = hasPermission('production_entry.create');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [page, setPage] = useState(1);
  const [workOrder, setWorkOrder] = useState(null);
  const deferredSearch = useDeferredValue(search);
  const params = {
    page,
    limit: 20,
    ...(deferredSearch.trim() && { search: deferredSearch.trim() }),
    ...(status !== 'all' && { status }),
    ...(clientId !== 'all' && { clientId }),
  };
  const { data, isLoading, error } = useProductionOrders(params);
  const { data: clientData } = useClients({ enabled: hasPermission('client.read') });
  const orders = data?.productionOrders ?? [];
  const assignedOrders = orders.filter((order) =>
    (order.assignedWorkers ?? []).some(
      (worker) => String(worker?._id ?? worker) === String(user?._id)
    )
  );
  const availableOrders = orders.filter((order) => (order.assignedWorkers ?? []).length === 0);

  function resetPage(callback) {
    callback();
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Orders"
        description="Manage customer and supplier POs being manufactured"
        action={
          <PermissionGuard permission="production_order.create">
            <Button asChild>
              <Link href="/production-orders/create">
                <Plus className="h-4 w-4" /> New Production Order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_220px_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => resetPage(() => setSearch(event.target.value))}
              className="pl-9"
              placeholder="Search PO number or description"
            />
          </div>
          <Select value={status} onValueChange={(value) => resetPage(() => setStatus(value))}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PRODUCTION_ORDER_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {productionOrderStatusLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className={showWorkerMobile ? 'hidden' : ''}>
            <Select value={clientId} onValueChange={(value) => resetPage(() => setClientId(value))}>
              <SelectTrigger>
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {(clientData?.clients ?? []).map((client) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data?.totalRecords ?? 0} production orders</span>
      </div>

      {showWorkerMobile && (
        <div className="space-y-6" aria-live="polite">
          {isLoading ? (
            <div className="space-y-3">
              <WorkerCardSkeleton />
            </div>
          ) : error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error.message}
            </p>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No production orders found"
              description="Adjust the current filters to find available work."
            />
          ) : (
            <>
              <section className="space-y-3" aria-labelledby="assigned-orders-heading">
                <div>
                  <h2 id="assigned-orders-heading" className="font-semibold">
                    My Assigned Orders
                  </h2>
                  <p className="text-sm text-muted-foreground">Work specifically assigned to you</p>
                </div>
                {assignedOrders.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No production orders are assigned to you.
                  </p>
                ) : (
                  assignedOrders.map((order) => (
                    <WorkerOrderCard
                      key={order._id}
                      order={order}
                      onAddWork={canRecordProduction ? setWorkOrder : undefined}
                    />
                  ))
                )}
              </section>
              <section className="space-y-3" aria-labelledby="available-orders-heading">
                <div>
                  <h2 id="available-orders-heading" className="font-semibold">
                    Available Orders
                  </h2>
                  <p className="text-sm text-muted-foreground">Unassigned work you can record</p>
                </div>
                {availableOrders.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No unassigned production orders are available.
                  </p>
                ) : (
                  availableOrders.map((order) => (
                    <WorkerOrderCard
                      key={order._id}
                      order={order}
                      onAddWork={canRecordProduction ? setWorkOrder : undefined}
                    />
                  ))
                )}
              </section>
            </>
          )}
        </div>
      )}

      {!showWorkerMobile && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={6} cols={canReadInvoices ? 9 : 8} />
              </div>
            ) : error ? (
              <p className="p-6 text-sm text-destructive">{error.message}</p>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No production orders found"
                description="Create a production order or adjust the current filters."
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Production deadline</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    {canReadInvoices && <TableHead>Invoice</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-mono font-semibold">{order.poNumber}</TableCell>
                      <TableCell>{order.client?.name ?? 'Unknown client'}</TableCell>
                      <TableCell className="max-w-64 truncate">
                        {order.productionDescription}
                      </TableCell>
                      <TableCell>
                        <DeadlineSummary order={order} />
                      </TableCell>
                      <TableCell>{formatCurrency(order.workerRate)}</TableCell>
                      <TableCell>
                        <ProductionStatus order={order} />
                      </TableCell>
                      <TableCell>
                        <ProgressSummary order={order} />
                      </TableCell>
                      {canReadInvoices && (
                        <TableCell>
                          <InvoiceRelationship relationship={order.invoiceRelationship} />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              href={`/production-orders/${order._id}`}
                              aria-label={`View ${order.poNumber}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <PermissionGuard permission="production_order.update">
                            <Button asChild variant="ghost" size="icon">
                              <Link
                                href={`/production-orders/${order._id}/edit`}
                                aria-label={`Edit ${order.poNumber}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          </PermissionGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ProductionEntryFormDialog
        open={Boolean(workOrder)}
        onOpenChange={(nextOpen) => !nextOpen && setWorkOrder(null)}
        initialProductionOrderId={workOrder?._id}
      />
    </div>
  );
}
