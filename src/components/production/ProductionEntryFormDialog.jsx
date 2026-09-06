'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useCreateProductionEntry, useUpdateProductionEntry } from '@/hooks/useProductionEntries';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatters';

const today = () => new Date().toISOString().slice(0, 10);

export default function ProductionEntryFormDialog({ open, onOpenChange, entry = null }) {
  const { user } = useAuth();
  const isEditing = Boolean(entry);
  const [productionOrderId, setProductionOrderId] = useState('');
  const [date, setDate] = useState(today());
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const { data: orderData, isLoading: ordersLoading } = useProductionOrders({ limit: 100 });
  const createEntry = useCreateProductionEntry();
  const updateEntry = useUpdateProductionEntry();
  const mutation = isEditing ? updateEntry : createEntry;
  const orders = useMemo(() => orderData?.productionOrders ?? [], [orderData?.productionOrders]);
  const availableOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (['COMPLETED', 'CANCELLED'].includes(order.status)) return false;
        const assignedWorkerIds = (order.assignedWorkers ?? []).map((worker) =>
          String(worker?._id ?? worker)
        );
        return assignedWorkerIds.length === 0 || assignedWorkerIds.includes(String(user?._id));
      }),
    [orders, user?._id]
  );
  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === productionOrderId) ?? entry?.productionOrder,
    [entry?.productionOrder, orders, productionOrderId]
  );

  useEffect(() => {
    if (!open) return;
    setProductionOrderId(entry?.productionOrder?._id ?? '');
    setDate(entry?.date?.slice(0, 10) ?? today());
    setQuantity(entry?.quantity?.toString() ?? '');
    setNotes(entry?.notes ?? '');
  }, [entry, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!productionOrderId || !date || !Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      toast({
        title: 'Complete the required fields',
        description: 'Select an order and enter a positive whole quantity.',
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
          productionOrderId,
          date,
          quantity: parsedQuantity,
          notes,
        });
        toast({
          title: 'Production entry submitted',
          description: 'It will count toward production after approval.',
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

  const amount = selectedOrder
    ? (Number(quantity) || 0) * Number(selectedOrder.workerRate ?? entry?.unitRate ?? 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit production entry' : 'Record production'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Pending entries can be corrected before review.'
              : 'Submit the pieces you produced. Earnings are counted only after approval.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="entryProductionOrder">Production order *</Label>
            {isEditing ? (
              <Input
                id="entryProductionOrder"
                value={entry.productionOrder?.poNumber ?? ''}
                disabled
              />
            ) : (
              <Select value={productionOrderId} onValueChange={setProductionOrderId}>
                <SelectTrigger id="entryProductionOrder">
                  <SelectValue
                    placeholder={ordersLoading ? 'Loading orders...' : 'Select a production order'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders.map((order) => (
                    <SelectItem key={order._id} value={order._id}>
                      {order.poNumber} - {order.itemCode || 'Item code unavailable'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedOrder && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Rate snapshot</p>
                <p className="font-medium">
                  {formatCurrency(entry?.unitRate ?? selectedOrder.workerRate)} per piece
                </p>
              </div>
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
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryQuantity">Pieces produced *</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Save changes' : 'Submit for review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
