'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { toast } from '@/hooks/useToast';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(order, workers) {
  const eligibleWorkerIds = new Set(workers.map((worker) => String(worker._id)));
  return {
    poNumber: order?.poNumber ?? '',
    itemCode: order?.itemCode ?? '',
    clientId: order?.client?._id ?? order?.client ?? '',
    productId: order?.product?._id ?? order?.product ?? 'none',
    productionDescription: order?.productionDescription ?? '',
    orderedQuantity: order?.orderedQuantity ?? '',
    workerRate: order?.workerRate ?? '',
    startDate: order?.startDate?.slice(0, 10) ?? today(),
    dueDate: order?.dueDate?.slice(0, 10) ?? today(),
    notes: order?.notes ?? '',
    assignedWorkerIds: (order?.assignedWorkers ?? [])
      .map((worker) => String(worker?._id ?? worker))
      .filter((workerId) => eligibleWorkerIds.has(workerId)),
  };
}

export default function ProductionOrderForm({
  productionOrder,
  clients,
  products,
  workers = [],
  canAssignWorkers = false,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}) {
  const [form, setForm] = useState(() => initialForm(productionOrder, workers));
  const [assignmentsChanged, setAssignmentsChanged] = useState(false);

  useEffect(() => {
    setForm(initialForm(productionOrder, workers));
    setAssignmentsChanged(false);
  }, [productionOrder, workers]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectProduct(productId) {
    const product = products.find((item) => item._id === productId);
    setForm((current) => ({
      ...current,
      productId,
      productionDescription:
        product && !current.productionDescription.trim()
          ? product.name
          : current.productionDescription,
    }));
  }

  function toggleWorker(workerId) {
    setAssignmentsChanged(true);
    setForm((current) => ({
      ...current,
      assignedWorkerIds: current.assignedWorkerIds.includes(workerId)
        ? current.assignedWorkerIds.filter((id) => id !== workerId)
        : [...current.assignedWorkerIds, workerId],
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (
      !form.poNumber.trim() ||
      !form.itemCode.trim() ||
      !form.clientId ||
      !form.productionDescription.trim() ||
      !form.startDate ||
      !form.dueDate
    ) {
      toast({ title: 'Complete all required production order fields', variant: 'destructive' });
      return;
    }
    if (!Number.isInteger(Number(form.orderedQuantity)) || Number(form.orderedQuantity) <= 0) {
      toast({ title: 'Ordered quantity must be a positive whole number', variant: 'destructive' });
      return;
    }
    if (form.workerRate === '' || Number(form.workerRate) < 0) {
      toast({ title: 'Worker rate must be zero or greater', variant: 'destructive' });
      return;
    }
    if (new Date(form.dueDate) < new Date(form.startDate)) {
      toast({ title: 'Due date cannot be before the start date', variant: 'destructive' });
      return;
    }

    const { assignedWorkerIds, ...fields } = form;
    onSubmit({
      ...fields,
      productId: form.productId === 'none' ? null : form.productId,
      poNumber: form.poNumber.trim(),
      itemCode: form.itemCode.trim(),
      productionDescription: form.productionDescription.trim(),
      orderedQuantity: Number(form.orderedQuantity),
      workerRate: Number(form.workerRate),
      notes: form.notes.trim(),
      ...(canAssignWorkers && (!productionOrder || assignmentsChanged) && { assignedWorkerIds }),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="poNumber">PO Number *</Label>
            <Input
              id="poNumber"
              value={form.poNumber}
              onChange={(event) => updateField('poNumber', event.target.value)}
              placeholder="PO-2026-001"
            />
            <p className="text-xs text-muted-foreground">
              PO numbers are unique and stored in uppercase.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="itemCode">Item Code *</Label>
            <Input
              id="itemCode"
              value={form.itemCode}
              onChange={(event) => updateField('itemCode', event.target.value)}
              placeholder="JK001"
            />
            <p className="text-xs text-muted-foreground">Item codes are stored in uppercase.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={form.clientId} onValueChange={(value) => updateField('clientId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client._id} value={client._id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Catalogue product (optional)</Label>
            <Select value={form.productId} onValueChange={selectProduct}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No catalogue product</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product._id} value={product._id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="productionDescription">Production description *</Label>
            <Textarea
              id="productionDescription"
              value={form.productionDescription}
              onChange={(event) => updateField('productionDescription', event.target.value)}
              placeholder="Describe the garment or manufacturing work required"
            />
          </div>
          {canAssignWorkers && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Assigned Workers (optional)</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {workers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active workers are currently eligible for assignment.
                  </p>
                ) : (
                  workers.map((worker) => (
                    <label
                      key={worker._id}
                      className="flex cursor-pointer items-start gap-2 rounded-sm p-1 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                        checked={form.assignedWorkerIds.includes(String(worker._id))}
                        onChange={() => toggleWorker(String(worker._id))}
                      />
                      <span className="text-sm">
                        <span className="block font-medium">{worker.username}</span>
                        <span className="block text-xs text-muted-foreground">{worker.email}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to allow any eligible worker to record production.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="orderedQuantity">Ordered quantity *</Label>
            <Input
              id="orderedQuantity"
              type="number"
              min="1"
              step="1"
              value={form.orderedQuantity}
              onChange={(event) => updateField('orderedQuantity', event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workerRate">Worker rate per approved unit *</Label>
            <Input
              id="workerRate"
              type="number"
              min="0"
              step="0.01"
              value={form.workerRate}
              onChange={(event) => updateField('workerRate', event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start date *</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(event) => updateField('startDate', event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due date *</Label>
            <Input
              id="dueDate"
              type="date"
              min={form.startDate}
              value={form.dueDate}
              onChange={(event) => updateField('dueDate', event.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="productionNotes">Notes</Label>
            <Textarea
              id="productionNotes"
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
              placeholder="Special instructions, fabric details, or delivery notes"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
