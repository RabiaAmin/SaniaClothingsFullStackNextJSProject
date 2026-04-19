'use client';

import { useState, useEffect } from 'react';
import { useFetch } from '@/hooks/useFetch';
import bankAccountApi from '@/lib/api/bankAccount.api';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

import { Plus, MoreHorizontal, Pencil, Trash2, CreditCard, Loader2 } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'VAT', label: 'VAT Account' },
  { value: 'NON_VAT', label: 'Non-VAT Account' },
];
const EMPTY = () => ({
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
  branchCode: '',
  accountType: 'NON_VAT',
});

// ── Bank Account Form Dialog ──────────────────────────────────────────────────
function BankAccountDialog({ open, onClose, account, onSaved }) {
  const isEdit = !!account;
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      account
        ? {
            bankName: account.bankName ?? '',
            accountHolderName: account.accountHolderName ?? '',
            accountNumber: account.accountNumber ?? '',
            branchCode: account.branchCode ?? '',
            accountType: account.accountType ?? 'NON_VAT',
          }
        : EMPTY()
    );
  }, [account, open]);

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.bankName || !form.accountHolderName || !form.accountNumber) {
      toast({ title: 'Bank name, account holder, and number are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await bankAccountApi.updateBankAccount(account._id ?? account.id, {
          bankName: form.bankName,
          accountHolderName: form.accountHolderName,
          accountNumber: form.accountNumber,
          branchCode: form.branchCode || undefined,
        });
        toast({ title: 'Bank account updated' });
      } else {
        await bankAccountApi.createBankAccount(form);
        toast({ title: 'Bank account added' });
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
          <DialogTitle>{isEdit ? 'Edit Bank Account' : 'Add Bank Account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Type */}
          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <Select
              value={form.accountType}
              onValueChange={(v) => set('accountType', v)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Bank Name *</Label>
            <Input
              value={form.bankName}
              onChange={(e) => set('bankName', e.target.value)}
              placeholder="First National Bank"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Account Holder Name *</Label>
            <Input
              value={form.accountHolderName}
              onChange={(e) => set('accountHolderName', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Number *</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => set('accountNumber', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Branch Code</Label>
            <Input
              value={form.branchCode}
              onChange={(e) => set('branchCode', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Add Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BankAccountsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: raw,
    isLoading,
    error,
    refetch,
  } = useFetch(() => bankAccountApi.getAllBankAccounts());

  const accounts = raw ?? [];


  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }
  function openEdit(a) {
    setEditTarget(a);
    setDialogOpen(true);
  }
  function closeDialog() {
    setDialogOpen(false);
    setEditTarget(null);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await bankAccountApi.deleteBankAccount(deleteTarget);
      toast({ title: 'Bank account removed' });
      refetch();
    } catch (err) {
      toast({ title: err.message ?? 'Delete failed', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Account Manager"
        description="Manage bank accounts for your businesses"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No bank accounts"
              description="Add a bank account to include payment details on invoices."
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add Account
                </Button>
              }
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Holder</TableHead>
                  <TableHead>Account #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Branch Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a._id ?? a.id}>
                    <TableCell className="font-medium">{a.bankName}</TableCell>
                    <TableCell>{a.accountHolderName}</TableCell>
                    <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.accountType ?? 'NON_VAT'} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.branchCode ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(a)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(a._id ?? a.id)}
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

      <BankAccountDialog
        open={dialogOpen}
        onClose={closeDialog}
        account={editTarget}
        onSaved={refetch}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove bank account?"
        description="This bank account will be permanently removed."
      />
    </div>
  );
}
