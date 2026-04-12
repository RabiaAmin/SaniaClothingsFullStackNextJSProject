'use client';

import { useState, useEffect } from 'react';
import { useFetch } from '@/hooks/useFetch';
import bankAccountApi from '@/lib/api/bankAccount.api';
import businessApi from '@/lib/api/business.api';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Plus, MoreHorizontal, Pencil, Trash2, CreditCard, Loader2, Star } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'CAD', 'AUD'];
const ACCOUNT_TYPES = [
  { value: 'VAT',     label: 'VAT Account'     },
  { value: 'NON_VAT', label: 'Non-VAT Account' },
];
const EMPTY = () => ({
  businessId: '', bankName: '', accountName: '', accountNumber: '',
  routingNumber: '', iban: '', swiftCode: '', currency: 'USD', accountType: 'NON_VAT',
});

// ── Bank Account Form Dialog ──────────────────────────────────────────────────
function BankAccountDialog({ open, onClose, account, businesses, onSaved }) {
  const isEdit = !!account;
  const [form, setForm] = useState(EMPTY());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(account
      ? {
          businessId:    account.businessId    ?? '',
          bankName:      account.bankName      ?? '',
          accountName:   account.accountName   ?? '',
          accountNumber: account.accountNumber ?? '',
          routingNumber: account.routingNumber ?? '',
          iban:          account.iban          ?? '',
          swiftCode:     account.swiftCode     ?? '',
          currency:      account.currency      ?? 'USD',
          accountType:   account.accountType   ?? 'NON_VAT',
        }
      : EMPTY()
    );
  }, [account, open]);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.bankName || !form.accountName || !form.accountNumber) {
      toast({ title: 'Bank name, account name, and number are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await bankAccountApi.updateBankAccount(account.id, form);
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
          {/* Business */}
          <div className="space-y-1.5">
            <Label>Business</Label>
            <Select value={form.businessId} onValueChange={(v) => set('businessId', v)}>
              <SelectTrigger><SelectValue placeholder="Select business (optional)" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Account Type */}
          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <Select value={form.accountType} onValueChange={(v) => set('accountType', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Bank + Account */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bank Name *</Label>
              <Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} placeholder="First National Bank" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Account Holder Name *</Label>
            <Input value={form.accountName} onChange={(e) => set('accountName', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Account Number *</Label>
            <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Routing #</Label>
              <Input value={form.routingNumber} onChange={(e) => set('routingNumber', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={(e) => set('iban', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>SWIFT / BIC</Label>
              <Input value={form.swiftCode} onChange={(e) => set('swiftCode', e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [settingDefault, setSettingDefault] = useState(null);

  const { data: raw, isLoading, error, refetch } = useFetch(
    () => bankAccountApi.getBankAccounts({ limit: 100 })
  );
  const { data: bizRaw } = useFetch(() => businessApi.getBusinesses({ limit: 50 }));

  const accounts   = normalizeList(raw);
  const businesses = normalizeList(bizRaw);
  const bizMap     = Object.fromEntries(businesses.map((b) => [b.id, b.name]));

  function openCreate() { setEditTarget(null); setDialogOpen(true); }
  function openEdit(a)  { setEditTarget(a);    setDialogOpen(true); }
  function closeDialog(){ setDialogOpen(false); setEditTarget(null); }

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

  async function handleSetDefault(id) {
    setSettingDefault(id);
    try {
      await bankAccountApi.setDefault(id);
      toast({ title: 'Default account updated' });
      refetch();
    } catch (err) {
      toast({ title: err.message ?? 'Failed', variant: 'destructive' });
    } finally {
      setSettingDefault(null);
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
            <div className="p-6"><TableSkeleton rows={5} cols={6} /></div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : accounts.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No bank accounts"
              description="Add a bank account to include payment details on invoices."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Account</Button>}
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {a.bankName}
                        {a.isDefault && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{a.accountName}</TableCell>
                    <TableCell className="font-mono text-xs">{a.accountNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.accountType ?? 'NON_VAT'} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bizMap[a.businessId] ?? '—'}
                    </TableCell>
                    <TableCell className="font-medium">{a.currency}</TableCell>
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
                          {!a.isDefault && (
                            <DropdownMenuItem
                              onClick={() => handleSetDefault(a.id)}
                              disabled={settingDefault === a.id}
                            >
                              {settingDefault === a.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Star className="h-4 w-4" />}
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(a.id)}
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
        businesses={businesses}
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
