'use client';

import { useEffect, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useApproveProductionEntry, useRejectProductionEntry } from '@/hooks/useProductionEntries';
import { toast } from '@/hooks/useToast';

export default function ProductionEntryReviewDialog({ entry, decision, onOpenChange }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const approve = useApproveProductionEntry();
  const reject = useRejectProductionEntry();
  const mutation = decision === 'APPROVED' ? approve : reject;
  const open = Boolean(entry && decision);
  const remaining = entry?.productionOrder
    ? Math.max(0, entry.productionOrder.orderedQuantity - entry.productionOrder.approvedQuantity)
    : null;

  useEffect(() => {
    if (open) setReviewNotes('');
  }, [open, entry?._id, decision]);

  async function handleReview() {
    try {
      await mutation.mutateAsync({ id: entry._id, reviewNotes });
      toast({
        title: decision === 'APPROVED' ? 'Production entry approved' : 'Production entry rejected',
        description:
          decision === 'APPROVED'
            ? `${entry.quantity} pieces now count toward production and earnings.`
            : 'Rejected pieces do not count toward production or earnings.',
      });
      onOpenChange(false);
    } catch (requestError) {
      toast({
        title: requestError.message ?? 'Could not review production entry',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === 'APPROVED' ? 'Approve production entry?' : 'Reject production entry?'}
          </DialogTitle>
          <DialogDescription>
            {entry?.worker?.username ?? entry?.worker?.email ?? 'This worker'} submitted{' '}
            {entry?.quantity ?? 0} pieces for {entry?.productionOrder?.poNumber}.
            {decision === 'APPROVED'
              ? ' Approval adds these pieces to the order and worker earnings.'
              : ' Rejected pieces will not affect production totals or earnings.'}
          </DialogDescription>
        </DialogHeader>
        {decision === 'APPROVED' && remaining !== null && (
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <span className="text-muted-foreground">Remaining before approval: </span>
            <span className="font-semibold tabular-nums">{remaining} pieces</span>
            {entry.quantity > remaining && (
              <p className="mt-1 text-xs font-medium text-destructive">
                This claim exceeds the remaining order quantity and cannot be approved.
              </p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="reviewNotes">Review notes</Label>
          <Textarea
            id="reviewNotes"
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            placeholder="Optional reason or review note"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={decision === 'APPROVED' ? 'default' : 'destructive'}
            onClick={handleReview}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {decision === 'APPROVED' ? 'Approve entry' : 'Reject entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
