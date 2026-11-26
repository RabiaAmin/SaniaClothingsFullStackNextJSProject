'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { Check, ClipboardCheck, Pencil, Plus, Search, Undo2, X } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import ProductionEntryFormDialog from '@/components/production/ProductionEntryFormDialog';
import ProductionEntryAuditNote from '@/components/production/ProductionEntryAuditNote';
import ProductionEntryReverseDialog from '@/components/production/ProductionEntryReverseDialog';
import ProductionEntryReviewDialog from '@/components/production/ProductionEntryReviewDialog';
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
import { useAuth } from '@/hooks/useAuth';
import { useProductionEntries } from '@/hooks/useProductionEntries';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  canRecordProduction,
  canReverseEntry,
  canReverseProduction,
  storedDateInputValue,
  PRODUCTION_ENTRY_STATUSES,
  productionEntryStatusLabel,
  productionEntryStatusVariant,
} from '@/lib/productionEntries';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { WorkerCardSkeleton, WorkerEntryCard } from '@/components/worker/WorkerMobileCards';
import { isProductionManagerView } from '@/lib/auth/productionViews';

function SummaryCard({ label, value, description, compact = false }) {
  return (
    <Card>
      <CardContent className={compact ? 'p-3 sm:p-4' : 'p-4'}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={
            compact
              ? 'mt-1 text-lg font-semibold tabular-nums sm:text-xl'
              : 'mt-1 text-2xl font-semibold tabular-nums'
          }
        >
          {value}
        </p>
        <p
          className={
            compact
              ? 'mt-1 hidden text-xs text-muted-foreground sm:block'
              : 'mt-1 text-xs text-muted-foreground'
          }
        >
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export default function ProductionEntriesPage() {
  const { user, hasPermission } = useAuth();
  const isWorkerView =
    hasPermission('production_entry.read_own') && !hasPermission('production_entry.read_all');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const showWorkerMobile = isWorkerView && isMobile;
  // Production Manager PWA: actionable entry cards instead of the dense table.
  const showManagerMobile = !isWorkerView && isMobile && isProductionManagerView(hasPermission);
  const canRecord = canRecordProduction(hasPermission);
  const canReverse = canReverseProduction(hasPermission);
  const [reversingEntry, setReversingEntry] = useState(null);
  const [correction, setCorrection] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [review, setReview] = useState({ entry: null, decision: null });
  const deferredSearch = useDeferredValue(search);
  const params = {
    page,
    limit: 20,
    ...(deferredSearch.trim() && { search: deferredSearch.trim() }),
    ...(status !== 'all' && { status }),
  };
  const { data, isLoading, error } = useProductionEntries(params);
  const entries = data?.productionEntries ?? [];
  const stats = data?.stats ?? {};

  useEffect(() => {
    if (!canRecord) return undefined;
    function openEntryForm() {
      setFormOpen(true);
      if (window.location.search.includes('record=true')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    window.addEventListener('open-production-entry', openEntryForm);
    if (new URLSearchParams(window.location.search).get('record') === 'true') openEntryForm();
    return () => window.removeEventListener('open-production-entry', openEntryForm);
  }, [canRecord]);

  // Workers are read-only. Managers may correct historical PENDING entries before review.
  function canEdit(entry) {
    return entry.status === 'PENDING' && hasPermission('production_entry.update_all');
  }

  function canReview(entry, permission) {
    const workerId = entry.worker?._id ?? entry.worker;
    return entry.status === 'PENDING' && workerId !== user?._id && hasPermission(permission);
  }

  function resetPage(callback) {
    callback();
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Entries"
        description={
          hasPermission('production_entry.read_all')
            ? 'Record verified worker production and review historical pending entries'
            : 'Production recorded for you by your production manager, with earnings'
        }
        action={
          canRecord && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Record Production
            </Button>
          )
        }
      />

      <div className='grid sm:grid-cols-2 gap-2'S>
        <SummaryCard
          label="Approved pieces"
          value={stats.approvedQuantity ?? 0}
          description="Counted toward production"
          compact={showWorkerMobile}
        />
        <SummaryCard
          label="Approved earnings"
          value={formatCurrency(stats.approvedAmount ?? 0)}
          description="Based on snapshotted rates"
          compact={showWorkerMobile}
        />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => resetPage(() => setSearch(event.target.value))}
              className="pl-9"
              placeholder="Search PO number or production description"
            />
        </div>
        {
        showManagerMobile && (

          <Select value={status} onValueChange={(value) => resetPage(() => setStatus(value))}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {PRODUCTION_ENTRY_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {productionEntryStatusLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
        }
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data?.totalRecords ?? 0} production entries</span>
      </div>

      {showWorkerMobile && (
        <div className="space-y-3" aria-live="polite">
          {isLoading ? (
            <WorkerCardSkeleton />
          ) : error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error.message}
            </p>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No production entries found"
              description={
                isWorkerView
                  ? 'Production recorded for you will appear here.'
                  : 'Record production or adjust the current filters.'
              }
            />
          ) : (
            entries.map((entry) => (
              <WorkerEntryCard
                key={entry._id}
                entry={entry}
                onEdit={canEdit(entry) ? setEditingEntry : undefined}
              />
            ))
          )}
        </div>
      )}

      {showManagerMobile && (
        <div className="space-y-3" aria-live="polite" data-testid="manager-entry-cards">
          {isLoading ? (
            <WorkerCardSkeleton />
          ) : error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error.message}
            </p>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No production entries found"
              description="Record production or adjust the current filters."
            />
          ) : (
            entries.map((entry) => {
              const poNumber = entry.productionOrder?.poNumber;
              const actions = [
                canEdit(entry) && (
                  <Button
                    key="edit"
                    variant="outline"
                    className="h-11"
                    aria-label={`Edit entry for ${poNumber}`}
                    onClick={() => setEditingEntry(entry)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                ),
                canReview(entry, 'production_entry.approve') && (
                  <Button
                    key="approve"
                    variant="outline"
                    className="h-11"
                    aria-label={`Approve entry for ${poNumber}`}
                    onClick={() => setReview({ entry, decision: 'APPROVED' })}
                  >
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Approve
                  </Button>
                ),
                canReview(entry, 'production_entry.reject') && (
                  <Button
                    key="reject"
                    variant="outline"
                    className="h-11"
                    aria-label={`Reject entry for ${poNumber}`}
                    onClick={() => setReview({ entry, decision: 'REJECTED' })}
                  >
                    <X className="h-4 w-4 text-destructive" aria-hidden="true" /> Reject
                  </Button>
                ),
                canReverse && canReverseEntry(entry, user?._id) && (
                  <Button
                    key="reverse"
                    variant="outline"
                    className="h-11"
                    aria-label={`Reverse entry for ${poNumber}`}
                    onClick={() => setReversingEntry(entry)}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" /> Reverse
                  </Button>
                ),
              ].filter(Boolean);
              return (
                <WorkerEntryCard
                  key={entry._id}
                  entry={entry}
                  actions={actions.length > 0 ? actions : null}
                />
              );
            })
          )}
        </div>
      )}

      {!showWorkerMobile && !showManagerMobile && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={6} cols={8} />
              </div>
            ) : error ? (
              <p className="p-6 text-sm text-destructive">{error.message}</p>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No production entries found"
                description={
                  isWorkerView
                    ? 'Production recorded for you will appear here.'
                    : 'Record production or adjust the current filters.'
                }
                className="m-6"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell>{formatDate(entry.date)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono font-semibold">
                            {entry.productionOrder?.poNumber ?? 'Unknown PO'}
                          </p>
                          <p className="max-w-48 truncate text-xs text-muted-foreground">
                            {entry.productionOrder?.productionDescription}
                          </p>
                          {entry.notes && (
                            <p className="max-w-48 truncate text-xs text-muted-foreground">
                              Note: {entry.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.worker?.username ?? entry.worker?.email ?? 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {entry.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(entry.unitRate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(entry.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={productionEntryStatusVariant(entry.status)}>
                            {productionEntryStatusLabel(entry.status)}
                          </Badge>
                          {entry.reviewedBy && (
                            <p className="text-xs text-muted-foreground">
                              by {entry.reviewedBy.username ?? entry.reviewedBy.email}
                            </p>
                          )}
                          {entry.reviewNotes && (
                            <p className="max-w-40 truncate text-xs text-muted-foreground">
                              {entry.reviewNotes}
                            </p>
                          )}
                          <ProductionEntryAuditNote entry={entry} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit(entry) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit entry for ${entry.productionOrder?.poNumber}`}
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canReview(entry, 'production_entry.approve') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Approve entry for ${entry.productionOrder?.poNumber}`}
                              onClick={() => setReview({ entry, decision: 'APPROVED' })}
                            >
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {canReview(entry, 'production_entry.reject') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Reject entry for ${entry.productionOrder?.poNumber}`}
                              onClick={() => setReview({ entry, decision: 'REJECTED' })}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {canReverse && canReverseEntry(entry, user?._id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Reverse entry for ${entry.productionOrder?.poNumber}`}
                              onClick={() => setReversingEntry(entry)}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          )}
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

      {canRecord && <ProductionEntryFormDialog open={formOpen} onOpenChange={setFormOpen} />}
      {canReverse && (
        <>
          <ProductionEntryReverseDialog
            entry={reversingEntry}
            onOpenChange={(nextOpen) => !nextOpen && setReversingEntry(null)}
            onRecordCorrection={setCorrection}
          />
          <ProductionEntryFormDialog
            open={Boolean(correction)}
            onOpenChange={(nextOpen) => !nextOpen && setCorrection(null)}
            initialProductionOrderId={correction?.productionOrder?._id ?? ''}
            initialWorkerId={correction?.worker?._id ?? ''}
            initialDate={storedDateInputValue(correction?.date)}
          />
        </>
      )}
      <ProductionEntryFormDialog
        open={Boolean(editingEntry)}
        onOpenChange={(nextOpen) => !nextOpen && setEditingEntry(null)}
        entry={editingEntry}
      />
      <ProductionEntryReviewDialog
        entry={review.entry}
        decision={review.decision}
        onOpenChange={(nextOpen) => !nextOpen && setReview({ entry: null, decision: null })}
      />
    </div>
  );
}
