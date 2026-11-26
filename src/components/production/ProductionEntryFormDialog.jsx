'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useProductionOrder, useProductionOrders } from '@/hooks/useProductionOrders';
import { useCreateProductionEntry, useUpdateProductionEntry } from '@/hooks/useProductionEntries';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { localDateInputValue, storedDateInputValue } from '@/lib/productionEntries';
import { productionOrderTracking } from '@/lib/productionOrders';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

const ORDER_PAGE_SIZE = 20;

function workerLabel(worker) {
  return worker?.username ?? worker?.email ?? 'Unnamed worker';
}

function orderLabel(order) {
  return `${order.poNumber} - ${order.productionDescription || order.itemCode || 'Production item'}`;
}

// Admin/Production Manager form: records pieces they physically counted for an assigned
// worker. Recorded entries are approved immediately. Orders are found with server-side search
// and paging over open orders that have assigned workers, so no order is out of reach. Edit
// mode is kept only for correcting historical PENDING entries before review.
export default function ProductionEntryFormDialog({
  open,
  onOpenChange,
  entry = null,
  initialProductionOrderId = '',
  initialWorkerId = '',
  initialDate = '',
}) {
  const { user } = useAuth();
  const isEditing = Boolean(entry);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [workerId, setWorkerId] = useState('');
  const [date, setDate] = useState(localDateInputValue());
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const deferredSearch = useDeferredValue(orderSearch.trim());
  const { data: orderData, isFetching: ordersLoading } = useProductionOrders(
    {
      recordable: true,
      page: orderPage,
      limit: ORDER_PAGE_SIZE,
      ...(deferredSearch && { search: deferredSearch }),
    },
    { enabled: open && !isEditing }
  );
  const { data: initialOrderData } = useProductionOrder(
    open && !isEditing && initialProductionOrderId ? initialProductionOrderId : null
  );
  const createEntry = useCreateProductionEntry();
  const updateEntry = useUpdateProductionEntry();
  const mutation = isEditing ? updateEntry : createEntry;
  const orderResults = useMemo(
    () => orderData?.productionOrders ?? [],
    [orderData?.productionOrders]
  );
  const totalPages = orderData?.totalPages ?? 1;
  const totalRecords = orderData?.totalRecords ?? 0;
  const activeOrder = isEditing ? entry?.productionOrder : selectedOrder;
  // Keep the chosen order selectable even when it is not on the current search page.
  const selectableOrders = useMemo(
    () =>
      selectedOrder && !orderResults.some((order) => order._id === selectedOrder._id)
        ? [selectedOrder, ...orderResults]
        : orderResults,
    [orderResults, selectedOrder]
  );
  // Only active workers assigned to the selected order, excluding the recorder (no self-approval).
  const assignedWorkers = useMemo(
    () =>
      (selectedOrder?.assignedWorkers ?? []).filter(
        (worker) =>
          worker?._id && worker.isActive !== false && String(worker._id) !== String(user?._id)
      ),
    [selectedOrder?.assignedWorkers, user?._id]
  );
  const remainingQuantity = selectedOrder
    ? productionOrderTracking(selectedOrder).remainingQuantity
    : 0;
  const minDate = storedDateInputValue(activeOrder?.startDate) || undefined;
  const maxDate = localDateInputValue();
  const dueDate = storedDateInputValue(activeOrder?.dueDate);
  const isAfterDueDate = Boolean(date && dueDate && date > dueDate);

  useEffect(() => {
    if (!open) return;
    setSelectedOrder(null);
    setOrderSearch('');
    setOrderPage(1);
    setWorkerId(initialWorkerId || '');
    setDate(entry?.date ? storedDateInputValue(entry.date) : initialDate || localDateInputValue());
    setQuantity(entry?.quantity?.toString() ?? '');
    setNotes(entry?.notes ?? '');
  }, [entry, initialDate, initialWorkerId, open]);

  // Preselect the order passed in (order detail page or a correction after reversal).
  useEffect(() => {
    const initialOrder = initialOrderData?.productionOrder;
    if (open && initialOrder && !selectedOrder) setSelectedOrder(initialOrder);
  }, [initialOrderData?.productionOrder, open, selectedOrder]);

  // Preselect the only assigned worker; clear a worker who is not assigned to the chosen order.
  useEffect(() => {
    if (isEditing || !selectedOrder) return;
    if (assignedWorkers.length === 1) {
      setWorkerId(String(assignedWorkers[0]._id));
    } else if (!assignedWorkers.some((worker) => String(worker._id) === workerId)) {
      setWorkerId('');
    }
  }, [assignedWorkers, isEditing, selectedOrder, workerId]);

  function handleOrderChange(orderId) {
    const order = selectableOrders.find((item) => item._id === orderId);
    if (order) setSelectedOrder(order);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (
      (!isEditing && (!selectedOrder || !workerId)) ||
      !date ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      toast({
        title: 'Complete the required fields',
        description: isEditing
          ? 'Enter a valid date and a positive whole quantity.'
          : 'Select an order and worker, then enter the verified whole quantity.',
        variant: 'destructive',
      });
      return;
    }
    if (date > maxDate || (minDate && date < minDate)) {
      toast({
        title: 'Choose a valid production date',
        description: `Production dates must be between the order start date${minDate ? ` (${formatDate(minDate)})` : ''} and today.`,
        variant: 'destructive',
      });
      return;
    }
    if (!isEditing && parsedQuantity > remainingQuantity) {
      toast({
        title: 'Quantity exceeds the remaining order quantity',
        description: `Only ${remainingQuantity} pieces remain on this order.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditing) {
        await updateEntry.mutateAsync({
          id: entry._id,
          payload: { date, quantity: parsedQuantity, notes },
        });
        toast({ title: 'Production entry updated' });
      } else {
        await createEntry.mutateAsync({
          productionOrderId: selectedOrder._id,
          workerId,
          date,
          quantity: parsedQuantity,
          notes,
        });
        toast({
          title: 'Production recorded',
          description: 'The entry is approved and counts toward progress and earnings.',
        });
      }
      onOpenChange(false);
    } catch (requestError) {
      toast({
        title: requestError.message ?? 'Could not save production entry',
        variant: 'destructive',
      });
    }
  }

  const amount = activeOrder
    ? (Number(quantity) || 0) * Number(entry?.unitRate ?? activeOrder.workerRate ?? 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit production entry' : 'Record production'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Pending entries can be corrected before review.'
              : 'Record the pieces you counted and verified for an assigned worker. The entry is approved immediately.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="entryOrderSearch">Find order</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="entryOrderSearch"
                  value={orderSearch}
                  onChange={(event) => {
                    setOrderSearch(event.target.value);
                    setOrderPage(1);
                  }}
                  className="pl-9"
                  placeholder="Search PO number, item code, or description"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="entryProductionOrder">Production order *</Label>
            {isEditing ? (
              <Input
                id="entryProductionOrder"
                value={entry.productionOrder?.poNumber ?? ''}
                disabled
              />
            ) : (
              <Select value={selectedOrder?._id ?? ''} onValueChange={handleOrderChange}>
                <SelectTrigger id="entryProductionOrder">
                  <SelectValue
                    placeholder={ordersLoading ? 'Loading orders...' : 'Select an order'}
                  >
                    {selectedOrder ? orderLabel(selectedOrder) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectableOrders.length === 0 && !ordersLoading && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      {deferredSearch
                        ? 'No open orders with assigned workers match this search'
                        : 'No open orders with assigned workers'}
                    </p>
                  )}
                  {selectableOrders.map((order) => (
                    <SelectItem key={order._id} value={order._id} className="py-2.5">
                      <span className="flex flex-col pr-3 text-left">
                        <span className="font-mono font-semibold">{order.poNumber}</span>
                        <span className="max-w-72 truncate text-sm">
                          {order.productionDescription || order.product?.name || 'Production item'}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          Item code: {order.itemCode || 'Unavailable'} ·{' '}
                          {productionOrderTracking(order).remainingQuantity} remaining
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!isEditing && totalRecords > 0 && (
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {totalRecords} matching open order{totalRecords === 1 ? '' : 's'}
                  {totalPages > 1 ? ` · page ${orderPage} of ${totalPages}` : ''}
                </span>
                {totalPages > 1 && (
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={orderPage <= 1}
                      onClick={() => setOrderPage((page) => page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={orderPage >= totalPages}
                      onClick={() => setOrderPage((page) => page + 1)}
                    >
                      Next
                    </Button>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entryWorker">Worker *</Label>
            {isEditing ? (
              <Input id="entryWorker" value={workerLabel(entry.worker)} disabled />
            ) : (
              <Select
                value={workerId}
                onValueChange={setWorkerId}
                disabled={!selectedOrder || assignedWorkers.length === 0}
              >
                <SelectTrigger id="entryWorker">
                  <SelectValue
                    placeholder={
                      !selectedOrder
                        ? 'Select an order first'
                        : assignedWorkers.length === 0
                          ? 'No eligible assigned workers'
                          : 'Select an assigned worker'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {assignedWorkers.map((worker) => (
                    <SelectItem key={worker._id} value={String(worker._id)}>
                      {workerLabel(worker)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {activeOrder && (
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Rate snapshot</p>
                <p className="font-medium">
                  {formatCurrency(entry?.unitRate ?? activeOrder.workerRate)}
                </p>
              </div>
              {!isEditing && (
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="font-medium tabular-nums">{remainingQuantity} pieces</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Entry amount</p>
                <p className="font-medium tabular-nums">{formatCurrency(amount)}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Production date *</Label>
              <Input
                id="entryDate"
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(event) => setDate(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {minDate
                  ? `From the order start date (${formatDate(minDate)}) to today.`
                  : 'Cannot be in the future.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryQuantity">Verified quantity *</Label>
              <Input
                id="entryQuantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>
          </div>

          {isAfterDueDate && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              This date is after the order due date ({formatDate(dueDate)}). Late production on an
              overdue order is allowed.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="entryNotes">Notes</Label>
            <Textarea
              id="entryNotes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional production notes"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Record and approve'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
