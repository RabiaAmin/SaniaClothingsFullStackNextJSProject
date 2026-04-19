'use client';

import { useState, useEffect } from 'react';
import { useFetch } from '@/hooks/useFetch';
import businessApi from '@/lib/api/business.api';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Pencil, Plus, Loader2, Globe, Mail, Phone, MapPin, Hash } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';

const CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'CAD', 'AUD'];

const EMPTY = () => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  vatNumber: '',
  logoUrl: '',
  currency: 'ZAR',
});

// ── Business Form Dialog ──────────────────────────────────────────────────────
function BusinessDialog({ open, onClose, business, onSaved }) {
  const isEdit = !!business;
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      business
        ? {
            name: business.name ?? '',
            email: business.email ?? '',
            phone: business.phone ?? '',
            address: business.address ?? '',
            vatNumber: business.vatNumber ?? '',
            logoUrl: business.logoUrl ?? '',
            currency: business.currency ?? 'ZAR',
          }
        : EMPTY()
    );
  }, [business, open]);

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) {
      toast({ title: 'Business name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await businessApi.updateBusiness(form);
        toast({ title: 'Business profile updated' });
      } else {
        await businessApi.createBusiness(form);
        toast({ title: 'Business profile created' });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ title: err.message ?? 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Business Profile' : 'Add Business Profile'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Business Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>VAT Number</Label>
              <Input
                value={form.vatNumber}
                onChange={(e) => set('vatNumber', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo URL</Label>
            <Input
              type="url"
              value={form.logoUrl}
              onChange={(e) => set('logoUrl', e.target.value)}
              placeholder="https://…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Business Card ─────────────────────────────────────────────────────────────
function BusinessCard({ business, onEdit }) {
  const rows = [
    { icon: Mail, value: business.email },
    { icon: Phone, value: business.phone },
    { icon: MapPin, value: business.address },
    { icon: Hash, value: business.vatNumber, label: 'VAT' },
    { icon: Globe, value: business.currency },
  ].filter((r) => r.value);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          {business.logoUrl ? (
            <img
              src={business.logoUrl}
              alt="logo"
              className="h-10 w-10 rounded-lg object-contain border"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <CardTitle className="text-base">{business.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{business.currency ?? 'ZAR'}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => onEdit(business)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(({ icon: Icon, value, label }) => (
          <div key={value} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label && <span className="font-medium text-foreground">{label}:</span>}
            <span>{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BusinessPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data: raw, isLoading, error, refetch } = useFetch(() => businessApi.getBusiness());

  // API returns a single business record, not an array
  const businesses = raw?.business ? [raw.business] : [];

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }
  function openEdit(b) {
    setEditTarget(b);
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Profile"
        description="Manage your business identities used on invoices"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Business
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No business profiles"
          description="Add a business profile to start issuing invoices."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Business
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} onEdit={openEdit} />
          ))}
        </div>
      )}

      <BusinessDialog
        open={dialogOpen}
        onClose={closeDialog}
        business={editTarget}
        onSaved={refetch}
      />
    </div>
  );
}
