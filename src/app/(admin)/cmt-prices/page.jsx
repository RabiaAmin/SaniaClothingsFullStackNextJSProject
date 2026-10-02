'use client';

import { useEffect, useState } from 'react';
import { MoreHorizontal, Pencil, Plus, Tags, Trash2, Loader2 } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import {
  useCmtPrices,
  useCreateCmtPrice,
  useDeleteCmtPrice,
  useUpdateCmtPrice,
} from '@/hooks/useCmtPrices';

const EMPTY = { itemCode: '', style: '', cmtPrice: '', workerPrice: '', isActive: true };

function PriceDialog({ open, entry, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const createPrice = useCreateCmtPrice();
  const updatePrice = useUpdateCmtPrice();
  const saving = createPrice.isPending || updatePrice.isPending;

  useEffect(() => {
    setForm(
      entry
        ? {
            itemCode: entry.itemCode ?? '',
            style: entry.style ?? '',
            cmtPrice: entry.cmtPrice ?? '',
            workerPrice: entry.workerPrice ?? '',
            isActive: entry.isActive !== false,
          }
        : EMPTY
    );
  }, [entry, open]);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (
      !form.itemCode.trim() ||
      !form.style.trim() ||
      form.cmtPrice === '' ||
      form.workerPrice === ''
    ) {
      toast({ title: 'Complete all required price fields', variant: 'destructive' });
      return;
    }
    const payload = {
      ...form,
      itemCode: form.itemCode.trim(),
      style: form.style.trim(),
      cmtPrice: String(form.cmtPrice).replace(',', '.'),
      workerPrice: String(form.workerPrice).replace(',', '.'),
    };
    try {
      if (entry) await updatePrice.mutateAsync({ id: entry._id, payload });
      else await createPrice.mutateAsync(payload);
      toast({ title: entry ? 'CMT price updated' : 'CMT price added' });
      onClose();
    } catch (error) {
      toast({ title: error.message ?? 'Could not save CMT price', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? 'Edit CMT Price' : 'Add CMT Price'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item Code *</Label>
            <Input
              value={form.itemCode}
              onChange={(event) => set('itemCode', event.target.value)}
              placeholder="JABUT06"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Style *</Label>
            <Input
              value={form.style}
              onChange={(event) => set('style', event.target.value)}
              placeholder="P/C BUNNY JACKET"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CMT Price *</Label>
              <Input
                inputMode="decimal"
                value={form.cmtPrice}
                onChange={(event) => set('cmtPrice', event.target.value)}
                placeholder="45.75"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Worker Price *</Label>
              <Input
                inputMode="decimal"
                value={form.workerPrice}
                onChange={(event) => set('workerPrice', event.target.value)}
                placeholder="30.00"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => set('isActive', event.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Active
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {entry ? 'Update' : 'Add Price'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CmtPricesPage() {
  const { hasPermission } = useAuth();
  const { data, isLoading, error } = useCmtPrices();
  const deletePrice = useDeleteCmtPrice();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const entries = data?.cmtPrices ?? [];

  function openDialog(entry = null) {
    setEditTarget(entry);
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
  }
  async function handleDelete() {
    try {
      await deletePrice.mutateAsync(deleteTarget._id);
      toast({ title: 'CMT price removed' });
      setDeleteTarget(null);
    } catch (requestError) {
      toast({
        title: requestError.message ?? 'Could not remove CMT price',
        variant: 'destructive',
      });
    }
  }

  const canCreate = hasPermission('cmt_price.create');
  const canUpdate = hasPermission('cmt_price.update');
  const canDelete = hasPermission('cmt_price.delete');

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMT Price List"
        description="Manage current invoice and worker pricing by Item Code"
        action={
          canCreate ? (
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4" /> Add Price
            </Button>
          ) : null
        }
      />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error.message}</p>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No CMT prices"
              description="Add an Item Code before creating new invoices or production orders."
              action={
                canCreate ? (
                  <Button onClick={() => openDialog()}>
                    <Plus className="h-4 w-4" /> Add Price
                  </Button>
                ) : null
              }
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Style</TableHead>
                  <TableHead className="text-right">CMT Price</TableHead>
                  <TableHead className="text-right">Worker Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="font-mono font-medium">{entry.itemCode}</TableCell>
                    <TableCell>{entry.style}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.cmtPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(entry.workerPrice)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={entry.isActive ? 'Active' : 'Inactive'} />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => openDialog(entry)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(entry)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
      <PriceDialog open={dialogOpen} entry={editTarget} onClose={closeDialog} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deletePrice.isPending}
        title="Remove CMT price?"
        description="This removes the current lookup entry. Existing invoices and production orders keep their stored prices."
      />
    </div>
  );
}
