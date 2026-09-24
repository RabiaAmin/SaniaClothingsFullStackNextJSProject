'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Package,
  Pencil,
  Plus,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  productionOrderProgressColor,
  productionOrderStatusLabel,
  productionOrderStatusVariant,
  productionOrderTracking,
} from '@/lib/productionOrders';
import { productionEntryStatusLabel, productionEntryStatusVariant } from '@/lib/productionEntries';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

function OrderStatusIcon({ status }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />;
  if (status === 'OVERDUE') return <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />;
}

function EntryStatusIcon({ status }) {
  if (status === 'APPROVED') return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (status === 'REJECTED') return <XCircle className="h-4 w-4" aria-hidden="true" />;
  return <Clock3 className="h-4 w-4" aria-hidden="true" />;
}

export function WorkerOrderCard({ order, onAddWork }) {
  const tracking = productionOrderTracking(order);

  return (
    <Card className="overflow-hidden" data-testid={`worker-order-card-${order._id}`}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-base font-bold">
              <Package className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {order.poNumber}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">
              {order.productionDescription || order.product?.name || 'Production item'}
            </p>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
              Item code: {order.itemCode || 'Unavailable'}
            </p>
          </div>
          <Badge variant={productionOrderStatusVariant(tracking.status)} className="shrink-0 gap-1">
            <OrderStatusIcon status={tracking.status} />
            {productionOrderStatusLabel(tracking.status)}
          </Badge>
        </div>

        <div className="space-y-2" aria-label={`${tracking.progressPercentage}% complete`}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Production progress</span>
            <span className="font-semibold tabular-nums">{tracking.progressPercentage}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${productionOrderProgressColor(order)}`}
              style={{ width: `${tracking.progressPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/60 px-2 py-2">
              <p className="text-xs text-muted-foreground">Ordered</p>
              <p className="font-semibold tabular-nums">{tracking.orderedQuantity}</p>
            </div>
            <div className="rounded-md bg-muted/60 px-2 py-2">
              <p className="text-xs text-muted-foreground">Produced</p>
              <p className="font-semibold tabular-nums">{tracking.producedQuantity}</p>
            </div>
            <div className="rounded-md bg-muted/60 px-2 py-2">
              <p className="text-xs text-muted-foreground">To do</p>
              <p className="font-semibold tabular-nums">{tracking.remainingQuantity} remaining</p>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
            tracking.deadlineStatus === 'OVERDUE'
              ? 'bg-destructive/10 text-destructive'
              : tracking.deadlineStatus === 'DUE_SOON'
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                : 'bg-muted/50 text-muted-foreground'
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {tracking.productionDeadline
              ? `Deadline ${formatDate(tracking.productionDeadline)}`
              : 'Deadline unavailable'}
            {tracking.deadlineStatus === 'OVERDUE' ? ' · Overdue' : ''}
            {tracking.deadlineStatus === 'DUE_SOON' ? ' · Due soon' : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href={`/production-orders/${order._id}`}>
              View details <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {onAddWork && tracking.remainingQuantity > 0 && tracking.status !== 'CANCELLED' && (
            <Button className="h-11" onClick={() => onAddWork(order)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add Work
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkerEntryCard({ entry, onEdit, showItemCode = true }) {
  return (
    <Card data-testid={`worker-entry-card-${entry._id}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono font-bold">{entry.productionOrder?.poNumber ?? 'Unknown PO'}</p>
            {showItemCode && (
              <>
                <p className="mt-1 line-clamp-2 text-sm font-medium">
                  {entry.productionOrder?.productionDescription ||
                    entry.productionOrder?.product?.name ||
                    'Production item'}
                </p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Item code: {entry.productionOrder?.itemCode || 'Unavailable'}
                </p>
              </>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.worker?.username ?? entry.worker?.email ?? 'Worker'}
            </p>
          </div>
          <Badge variant={productionEntryStatusVariant(entry.status)} className="gap-1.5">
            <EntryStatusIcon status={entry.status} />
            {productionEntryStatusLabel(entry.status)}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Production date</dt>
            <dd className="mt-0.5 font-medium">{formatDate(entry.date)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Quantity</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums">{entry.quantity} pieces</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Rate</dt>
            <dd className="mt-0.5 font-medium tabular-nums">{formatCurrency(entry.unitRate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatCurrency(entry.totalAmount)}
            </dd>
          </div>
        </dl>

        {(entry.notes || entry.reviewNotes) && (
          <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
            {entry.notes && (
              <p>
                <span className="text-muted-foreground">Note:</span> {entry.notes}
              </p>
            )}
            {entry.reviewNotes && (
              <p>
                <span className="text-muted-foreground">Review:</span> {entry.reviewNotes}
              </p>
            )}
          </div>
        )}

        {onEdit && (
          <Button
            variant="outline"
            className="h-11 w-full"
            aria-label={`Edit entry for ${entry.productionOrder?.poNumber ?? 'production order'}`}
            onClick={() => onEdit(entry)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" /> Edit pending entry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkerCardSkeleton({ count = 3 }) {
  return Array.from({ length: count }, (_, index) => (
    <div key={index} className="h-64 animate-pulse rounded-xl border bg-muted/50" />
  ));
}
