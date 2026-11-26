'use client';

import { useEffect, useState } from 'react';
import { Loader2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReverseProductionEntry } from '@/hooks/useProductionEntries';
import { toast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

// Controlled correction of an approved entry. The original is kept for audit; the API creates a
// linked negative reversal entry dated today, so earlier payroll periods are not rewritten.
// After a reversal, the manager can record the corrected quantity as a new entry.
export default function ProductionEntryReverseDialog({ entry, onOpenChange, onRecordCorrection }) {
  const reverseEntry = useReverseProductionEntry();
  const [reason, setReason] = useState('');
  const [reversed, setReversed] = useState(null);

  useEffect(() => {
    if (entry) {
      setReason('');
      setReversed(null);
    }
  }, [entry]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      toast({ title: 'A reason is required to reverse this entry', variant: 'destructive' });
      return;
    }
    try {
      await reverseEntry.mutateAsync({ id: entry._id, reason: reason.trim() });
      setReversed(entry);
      toast({
        title: 'Production entry reversed',
        description: 'Order progress and earnings were adjusted with a reversal entry.',
      });
    } catch (requestError) {
      toast({
        title: requestError.message ?? 'Could not reverse production entry',
        variant: 'destructive',
      });
    }
  }

  const workerName = entry?.worker?.username ?? entry?.worker?.email ?? 'the worker';

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-lg">
        {entry && !reversed && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Reverse production entry?</DialogTitle>
              <DialogDescription>
                The original entry stays on record. A reversal entry dated today deducts{' '}
                {entry.quantity} pieces ({formatCurrency(entry.totalAmount)}) from {workerName} and
                from the order&apos;s progress. Payroll periods that have already passed are not
                changed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">PO number</p>
                <p className="font-mono font-medium">{entry.productionOrder?.poNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Production date</p>
                <p className="font-medium">{formatDate(entry.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quantity</p>
                <p className="font-medium tabular-nums">{entry.quantity}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reversalReason">Reason for reversal *</Label>
              <Textarea
                id="reversalReason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: pieces were counted twice"
                maxLength={1000}
                rows={3}
                required
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={reverseEntry.isPending}>
                {reverseEntry.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Undo2 className="h-4 w-4" />
                )}
                Reverse entry
              </Button>
            </DialogFooter>
          </form>
        )}
        {reversed && (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Entry reversed</DialogTitle>
              <DialogDescription>
                {reversed.quantity} pieces for {workerName} on {reversed.productionOrder?.poNumber}{' '}
                were reversed. If some of the pieces were valid, record the corrected quantity as a
                new entry.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onRecordCorrection?.(reversed);
                }}
              >
                Record corrected entry
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
