'use client';

import { useState, useEffect } from 'react';
import { useFetch } from '@/hooks/useFetch';
import businessApi from '@/lib/api/business.api';
import { formatCurrency } from '@/lib/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X, Building2 } from 'lucide-react';

const CATEGORIES = ['Finished Garments', 'CMT Services', 'Other Income'];
const STATUSES = ['Pending', 'Sent', 'Paid'];

const EMPTY_ITEM = () => ({ description: '', quantity: 1, unitPrice: '' });

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function InvoiceForm({
  defaultValues = null,
  clients = [],
  onSubmit,
  submitting = false,
  submitLabel = 'Create Invoice',
  onCancel,
}) {
  const { data: bizRaw } = useFetch(() => businessApi.getBusiness());
  const business = bizRaw?.business ?? null;

  const [form, setForm] = useState({
    invNo: defaultValues?.invNo ?? '',
    poNumber: defaultValues?.poNumber ?? '',
    date: defaultValues?.date?.slice(0, 10) ?? todayISO(),
    toClient: defaultValues?.toClient?._id ?? defaultValues?.toClient ?? '',
    category: defaultValues?.category ?? '',
    status: defaultValues?.status ?? 'Pending',
  });

  const [items, setItems] = useState(() => {
    if (defaultValues?.items?.length) {
      return defaultValues.items.map((i) => ({
        description: i.description ?? '',
        quantity: i.quantity ?? 1,
        unitPrice: i.unitPrice ?? '',
      }));
    }
    return [EMPTY_ITEM()];
  });

  const [vatEnabled, setVatEnabled] = useState(() => {
    if (defaultValues?.tax > 0) return true;
    if (defaultValues?.toClient?.vatApplicable) return true;
    return false;
  });

  useEffect(() => {
    if (!form.toClient) return;
    const client = clients.find((c) => c._id === form.toClient);
    if (client) setVatEnabled(!!client.vatApplicable);
  }, [form.toClient, clients]);

  const subTotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const tax = vatEnabled ? subTotal * 0.15 : 0;
  const totalAmount = subTotal + tax;

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((p) => [...p, EMPTY_ITEM()]);
  }

  function removeItem(idx) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!business) return;
    if (!form.toClient) return;
    if (!form.category) return;

    const payload = {
      fromBusiness: business._id,
      toClient: form.toClient,
      items: items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        amount: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      })),
      subTotal,
      tax,
      totalAmount,
      category: form.category,
      date: form.date,
      status: form.status,
      ...(form.invNo && { invNo: form.invNo }),
      ...(form.poNumber && { poNumber: form.poNumber }),
    };

    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* From Business */}
      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            From Business
          </p>
          {business ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{business.name}</span>
              {business.vatNumber && (
                <span className="text-xs text-muted-foreground">VAT: {business.vatNumber}</span>
              )}
              {business.address && (
                <span className="text-xs text-muted-foreground">· {business.address}</span>
              )}
            </div>
          ) : (
            <div className="h-5 w-64 animate-pulse rounded bg-muted" />
          )}
        </CardContent>
      </Card>

      {/* Core fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Client *</Label>
          <Select value={form.toClient} onValueChange={(v) => set('toClient', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                  {c.vatApplicable && (
                    <span className="ml-1 text-xs text-muted-foreground">(VAT)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => set('category', v)} required>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>PO Number *</Label>
          <Input
            value={form.poNumber}
            onChange={(e) => set('poNumber', e.target.value)}
            placeholder="PO-2026-001"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Invoice No{' '}
            <span className="text-xs text-muted-foreground">(auto-generated if empty)</span>
          </Label>
          <Input
            value={form.invNo}
            onChange={(e) => set('invNo', e.target.value)}
            placeholder="INV-0001"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-2">
        <Label>Line Items *</Label>
        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-2 text-right">Amount</span>
            <span className="col-span-1" />
          </div>

          {items.map((it, idx) => {
            const amount = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
            return (
              <div key={idx} className="grid grid-cols-12 items-center gap-2">
                <Input
                  className="col-span-5 h-8 text-sm"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  required
                />
                <Input
                  className="col-span-2 h-8 text-center text-sm"
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                />
                <Input
                  className="col-span-2 h-8 text-right text-sm"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                />
                <div className="col-span-2 text-right text-sm font-medium tabular-nums">
                  {formatCurrency(amount)}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          <div className="border-t pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Add line
            </Button>
          </div>
        </div>
      </div>

      {/* Totals + VAT */}
      <div className="rounded-lg border p-4 space-y-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={vatEnabled}
            onChange={(e) => setVatEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Apply VAT (15%)
        </label>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatCurrency(subTotal)}</span>
          </div>
          {vatEnabled && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (15%)</span>
              <span className="font-medium tabular-nums">{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting || !business}>
          {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
