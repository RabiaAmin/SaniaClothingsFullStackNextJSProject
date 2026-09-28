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
import { useAssignableWorkers, useUpdateProductionOrder } from '@/hooks/useProductionOrders';
import { toast } from '@/hooks/useToast';

export default function ProductionOrderAssignmentDialog({ order, onOpenChange }) {
  const open = Boolean(order);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const workersQuery = useAssignableWorkers({ enabled: open });
  const updateOrder = useUpdateProductionOrder();
  const workers = workersQuery.data?.workers ?? [];

  useEffect(() => {
    if (open) {
      setSelectedWorkerIds(
        (order?.assignedWorkers ?? []).map((worker) => String(worker?._id ?? worker))
      );
    }
  }, [open, order]);

  function toggleWorker(workerId) {
    setSelectedWorkerIds((current) =>
      current.includes(workerId)
        ? current.filter((selectedId) => selectedId !== workerId)
        : [...current, workerId]
    );
  }

  async function handleAssign() {
    try {
      await updateOrder.mutateAsync({
        id: order._id,
        payload: { assignedWorkerIds: selectedWorkerIds },
      });
      toast({
        title: 'Workers assigned',
        description: `${selectedWorkerIds.length} ${selectedWorkerIds.length === 1 ? 'worker' : 'workers'} assigned to ${order.poNumber}.`,
      });
      onOpenChange(false);
    } catch (requestError) {
      toast({
        title: requestError.message ?? 'Could not assign workers',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Workers</DialogTitle>
          <DialogDescription>
            Select one or more workers for {order?.poNumber}. Newly assigned workers will be
            notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Workers</Label>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
            {workersQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading eligible workers...</p>
            ) : workersQuery.error ? (
              <p className="text-sm text-destructive">{workersQuery.error.message}</p>
            ) : workers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active workers are currently eligible for assignment.
              </p>
            ) : (
              workers.map((worker) => {
                const workerId = String(worker._id);
                return (
                  <label
                    key={workerId}
                    className="flex cursor-pointer items-start gap-2 rounded-sm p-1 hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                      checked={selectedWorkerIds.includes(workerId)}
                      onChange={() => toggleWorker(workerId)}
                    />
                    <span className="text-sm">
                      <span className="block font-medium">{worker.username}</span>
                      <span className="block text-xs text-muted-foreground">{worker.email}</span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              selectedWorkerIds.length === 0 ||
              workersQuery.isLoading ||
              Boolean(workersQuery.error) ||
              updateOrder.isPending
            }
          >
            {updateOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
