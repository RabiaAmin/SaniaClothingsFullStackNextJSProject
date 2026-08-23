'use client';

import { useDeferredValue, useState } from 'react';
import { Check, ClipboardCheck, Pencil, Plus, Search, X } from 'lucide-react';
import PermissionGuard from '@/components/auth/PermissionGuard';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import TableSkeleton from '@/components/admin/TableSkeleton';
import ProductionEntryFormDialog from '@/components/production/ProductionEntryFormDialog';
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
import {
  PRODUCTION_ENTRY_STATUSES,
  productionEntryStatusLabel,
  productionEntryStatusVariant,
} from '@/lib/productionEntries';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

function SummaryCard({ label, value, description }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function ProductionEntriesPage() {
  const { user, hasPermission } = useAuth();
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

  function canEdit(entry) {
    if (entry.status !== 'PENDING') return false;
    if (hasPermission('production_entry.update_all')) return true;
    const workerId = entry.worker?._id ?? entry.worker;
    return hasPermission('production_entry.update_own') && workerId === user?._id;
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
            ? 'Review worker output and approve quantities that count toward production'
            : 'Record your completed pieces and track approval and earnings'
        }
        action={
          <PermissionGuard permission="production_entry.create">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Record Production
            </Button>
          </PermissionGuard>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Pending review"
          value={stats.pendingEntries ?? 0}
          description="Entries not yet counted"
        />
        <SummaryCard
          label="Approved pieces"
          value={stats.approvedQuantity ?? 0}
          description="Counted toward production"
        />
        <SummaryCard
          label="Approved earnings"
          value={formatCurrency(stats.approvedAmount ?? 0)}
          description="Based on snapshotted rates"
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data?.totalRecords ?? 0} production entries</span>
      </div>

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
              description="Record production or adjust the current filters."
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

      <ProductionEntryFormDialog open={formOpen} onOpenChange={setFormOpen} />
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
