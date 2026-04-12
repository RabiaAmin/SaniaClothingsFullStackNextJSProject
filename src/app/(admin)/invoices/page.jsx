'use client';

import { useState, useCallback } from 'react';
import { useFetch } from '@/hooks/useFetch';
import invoiceApi from '@/lib/api/invoice.api';
import clientApi from '@/lib/api/client.api';
import businessApi from '@/lib/api/business.api';
import { toast } from '@/hooks/useToast';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Plus, MoreHorizontal, Pencil, Trash2, Eye, CheckCircle, FileText, Loader2, X } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES = ['draft', 'sent', 'paid', 'overdue'];
const EMPTY_LINE = () => ({ description: '', quantity: 1, unitPrice: '' });
const EMPTY_FORM = () => ({
  clientId: '', businessId: '', dueDate: '', status: 'draft', notes: '',
});

function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

// ── Line Items Editor ─────────────────────────────────────────────────────────
function LineItemsEditor({ items, onChange }) {
  function update(idx, field, value) {
    onChange(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }
  function add()      { onChange([...items, EMPTY_LINE()]); }
  function remove(idx){ onChange(items.filter((_, i) => i !== idx)); }

  const subtotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="col-span-5">Description</span>
        <span className="col-span-2 text-center">Qty</span>
        <span className="col-span-3 text-right">Unit Price</span>
        <span className="col-span-2 text-right">Total</span>
      </div>

      {items.map((it, idx) => (
        <div key={idx} className="grid grid-cols-12 items-center gap-2">
          <Input
            className="col-span-5 h-8 text-sm"
            placeholder="Description"
            value={it.description}
            onChange={(e) => update(idx, 'description', e.target.value)}
          />
          <Input
            className="col-span-2 h-8 text-center text-sm"
            type="number"
            min="1"
            value={it.quantity}
            onChange={(e) => update(idx, 'quantity', e.target.value)}
          />
          <Input
            className="col-span-3 h-8 text-right text-sm"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={it.unitPrice}
            onChange={(e) => update(idx, 'unitPrice', e.target.value)}
          />
          <div className="col-span-1 text-right text-sm font-medium">
            {formatCurrency((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
          </div>
          <button
            type="button"
            onClick={() => remove(idx)}
            disabled={items.length === 1}
            className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between border-t pt-3">
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add line
        </Button>
        <span className="text-sm font-semibold">
          Subtotal: {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
}

// ── Invoice Form Dialog ───────────────────────────────────────────────────────
function InvoiceDialog({ open, onClose, invoice, clients, businesses, onSaved }) {
  const isEdit = !!invoice;
  const [form, setForm] = useState(
    invoice
      ? {
          clientId:   invoice.clientId   ?? '',
          businessId: invoice.businessId ?? '',
          dueDate:    invoice.dueDate?.slice(0, 10) ?? '',
          status:     invoice.status     ?? 'draft',
          notes:      invoice.notes      ?? '',
        }
      : EMPTY_FORM()
  );
  const [lineItems, setLineItems] = useState(
    invoice?.lineItems?.length ? invoice.lineItems.map((l) => ({
      description: l.description ?? '',
      quantity:    l.quantity    ?? 1,
      unitPrice:   l.unitPrice   ?? '',
    })) : [EMPTY_LINE()]
  );
  const [saving, setSaving] = useState(false);

  function set(field, val) { setForm((p) => ({ ...p, [field]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.clientId)    { toast({ title: 'Select a client',    variant: 'destructive' }); return; }
    if (!form.businessId)  { toast({ title: 'Select a business',  variant: 'destructive' }); return; }
    if (!form.dueDate)     { toast({ title: 'Set a due date',     variant: 'destructive' }); return; }
    if (!lineItems[0]?.description) {
      toast({ title: 'Add at least one line item', variant: 'destructive' }); return;
    }

    setSaving(true);
    try {
      const payload = { ...form, lineItems };
      if (isEdit) {
        await invoiceApi.updateInvoice(invoice.id, payload);
        toast({ title: 'Invoice updated' });
      } else {
        await invoiceApi.createInvoice(payload);
        toast({ title: 'Invoice created' });
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Client */}
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => set('clientId', v)}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Business */}
            <div className="space-y-1.5">
              <Label>Business *</Label>
              <Select value={form.businessId} onValueChange={(v) => set('businessId', v)}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Due Date */}
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </div>
            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label>Line Items</Label>
            <div className="rounded-lg border p-4">
              <LineItemsEditor items={lineItems} onChange={setLineItems} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Payment terms, thank-you note…"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── View Dialog ───────────────────────────────────────────────────────────────
function ViewInvoiceDialog({ invoice, clients, businesses, open, onClose }) {
  if (!invoice) return null;
  const client   = clients.find((c) => c.id === invoice.clientId);
  const business = businesses.find((b) => b.id === invoice.businessId);
  const subtotal = (invoice.lineItems ?? []).reduce(
    (s, l) => s + (l.quantity ?? 0) * (l.unitPrice ?? 0), 0
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{invoice.invoiceNumber ?? `Invoice #${invoice.id?.slice(0, 6)}`}</span>
            <StatusBadge status={invoice.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground">Client</p><p className="font-medium">{client?.name ?? '—'}</p></div>
          <div><p className="text-muted-foreground">Business</p><p className="font-medium">{business?.name ?? '—'}</p></div>
          <div><p className="text-muted-foreground">Due Date</p><p className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p></div>
          <div><p className="text-muted-foreground">Created</p><p className="font-medium">{invoice.createdAt ? formatDate(invoice.createdAt) : '—'}</p></div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoice.lineItems ?? []).map((l, i) => (
                <TableRow key={i}>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-center">{l.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(l.unitPrice ?? 0)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency((l.quantity ?? 0) * (l.unitPrice ?? 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-4 py-3 text-right">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="text-base font-bold">{formatCurrency(invoice.total ?? subtotal)}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <p className="font-medium">Notes</p>
            <p className="mt-1 text-muted-foreground">{invoice.notes}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');
  const [dialogMode, setDialogMode]     = useState(null); // 'create' | 'edit' | 'view'
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [markingPaid, setMarkingPaid]     = useState(null);

  const { data: invRaw, isLoading, error, refetch } = useFetch(
    () => invoiceApi.getInvoices(statusFilter !== 'all' ? { status: statusFilter } : {}),
    { deps: [statusFilter] }
  );
  const { data: cliRaw } = useFetch(() => clientApi.getClients({ limit: 200 }));
  const { data: bizRaw } = useFetch(() => businessApi.getBusinesses({ limit: 50 }));

  const invoices   = normalizeList(invRaw);
  const clients    = normalizeList(cliRaw);
  const businesses = normalizeList(bizRaw);
  const clientMap  = Object.fromEntries(clients.map((c) => [c.id, c.name]));

  // Client-side search filter
  const displayed = search.trim()
    ? invoices.filter((inv) => {
        const q = search.toLowerCase();
        return (
          (inv.invoiceNumber ?? '').toLowerCase().includes(q) ||
          (clientMap[inv.clientId] ?? '').toLowerCase().includes(q)
        );
      })
    : invoices;

  function openCreate() { setActiveInvoice(null); setDialogMode('create'); }
  function openEdit(inv){ setActiveInvoice(inv);  setDialogMode('edit');   }
  function openView(inv){ setActiveInvoice(inv);  setDialogMode('view');   }
  function closeDialog() { setDialogMode(null); setActiveInvoice(null); }

  async function handleDelete() {
    setDeleting(true);
    try {
      await invoiceApi.deleteInvoice(deleteTarget);
      toast({ title: 'Invoice deleted' });
      refetch();
    } catch (err) {
      toast({ title: err.message ?? 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleMarkPaid(id) {
    setMarkingPaid(id);
    try {
      await invoiceApi.markAsPaid(id);
      toast({ title: 'Invoice marked as paid' });
      refetch();
    } catch (err) {
      toast({ title: err.message ?? 'Failed', variant: 'destructive' });
    } finally {
      setMarkingPaid(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Manager"
        description="Create and manage your invoices"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by invoice # or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            {['all', ...STATUSES].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={6} cols={6} /></div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices found"
              description="Create your first invoice to get started."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Invoice</Button>}
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-semibold">
                      {inv.invoiceNumber ?? `#${inv.id?.slice(0, 6)}`}
                    </TableCell>
                    <TableCell>{clientMap[inv.clientId] ?? inv.clientName ?? '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(inv.total ?? 0)}
                    </TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(inv)}>
                            <Eye className="h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(inv)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          {inv.status !== 'paid' && (
                            <DropdownMenuItem
                              onClick={() => handleMarkPaid(inv.id)}
                              disabled={markingPaid === inv.id}
                            >
                              {markingPaid === inv.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <CheckCircle className="h-4 w-4" />}
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {(dialogMode === 'create' || dialogMode === 'edit') && (
        <InvoiceDialog
          open
          onClose={closeDialog}
          invoice={dialogMode === 'edit' ? activeInvoice : null}
          clients={clients}
          businesses={businesses}
          onSaved={refetch}
        />
      )}

      <ViewInvoiceDialog
        open={dialogMode === 'view'}
        onClose={closeDialog}
        invoice={activeInvoice}
        clients={clients}
        businesses={businesses}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete invoice?"
        description="This invoice will be permanently removed. This cannot be undone."
      />
    </div>
  );
}
