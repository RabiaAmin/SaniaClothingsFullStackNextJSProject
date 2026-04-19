'use client';

import { useState, useEffect } from 'react';
import { useClients, useAddClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Plus, MoreHorizontal, Pencil, Trash2, Users, Loader2, Search } from 'lucide-react';

const EMPTY_FORM = () => ({
  name: '',
  email: '',
  phone: '',
  telphone: '',
  address: '',
  registrationNumber: '',
  vatNumber: '',
  fax: '',
  vatApplicable: false,
  vatRate: 15,
});

function ClientDialog({ open, onClose, client, onSaved }) {
  const isEdit = !!client;
  const [form, setForm] = useState(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      client
        ? {
            name: client.name ?? '',
            email: client.email ?? '',
            phone: client.phone ?? '',
            telphone: client.telphone ?? '',
            address: client.address ?? '',
            registrationNumber: client.registrationNumber ?? '',
            vatNumber: client.vatNumber ?? '',
            fax: client.fax ?? '',
            vatApplicable: client.vatApplicable ?? false,
            vatRate: client.vatRate ?? 15,
          }
        : EMPTY_FORM()
    );
  }, [client, open]);

  const addMutation = useAddClient();
  const updateMutation = useUpdateClient();

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) {
      toast({ title: 'Client name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: client._id, payload: form });
        toast({ title: 'Client updated' });
      } else {
        await addMutation.mutateAsync(form);
        toast({ title: 'Client added' });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full Name / Company *</Label>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              placeholder="Ahmed Enterprises"
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
            <div className="space-y-1.5">
              <Label>Tel Phone</Label>
              <Input value={form.telphone} onChange={(e) => set('telphone', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fax</Label>
              <Input value={form.fax} onChange={(e) => set('fax', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Registration Number</Label>
              <Input
                value={form.registrationNumber}
                onChange={(e) => set('registrationNumber', e.target.value)}
                placeholder="REG-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>VAT Number</Label>
              <Input
                value={form.vatNumber}
                onChange={(e) => set('vatNumber', e.target.value)}
                placeholder="VAT-55555"
              />
            </div>
          </div>

          {/* VAT toggle */}
          <div className="rounded-lg border p-3 space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.vatApplicable}
                onChange={(e) => set('vatApplicable', e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              VAT Applicable
            </label>
            {form.vatApplicable && (
              <div className="space-y-1.5">
                <Label className="text-xs">VAT Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.vatRate}
                  onChange={(e) => set('vatRate', Number(e.target.value))}
                  className="w-24"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Add Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: raw, isLoading, error } = useClients();
  const deleteMutation = useDeleteClient();

  const clients = raw?.clients ?? [];
  const displayed = search.trim()
    ? clients.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }
  function openEdit(c) {
    setEditTarget(c);
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(deleteTarget);
      toast({ title: 'Client deleted' });
    } catch (err) {
      toast({
        title: err?.response?.data?.message ?? err.message ?? 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Manager"
        description="Manage your client directory"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error?.message ?? error}</p>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start creating invoices."
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add Client
                </Button>
              }
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>VAT #</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? '—'}</TableCell>
                    <TableCell>
                      {c.vatNumber ? (
                        <span className="rounded-md bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                          {c.vatNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.vatApplicable ? (
                        <Badge variant="secondary" className="text-xs">
                          {c.vatRate ?? 15}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(c._id)}
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

      <ClientDialog
        open={dialogOpen}
        onClose={closeDialog}
        client={editTarget}
        onSaved={() => {}}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        title="Delete client?"
        description="This client will be permanently removed. Associated invoices won't be deleted."
      />
    </div>
  );
}
