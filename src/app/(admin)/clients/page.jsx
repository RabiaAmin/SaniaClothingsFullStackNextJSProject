'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/useFetch';
import clientApi from '@/lib/api/client.api';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Plus, MoreHorizontal, Pencil, Trash2, Users, Loader2, Search } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalizeList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

const EMPTY = () => ({ name: '', email: '', phone: '', address: '', vatNumber: '' });

// ── Client Form Dialog ────────────────────────────────────────────────────────
function ClientDialog({ open, onClose, client, onSaved }) {
  const isEdit = !!client;
  const [form, setForm] = useState(
    client ? { name: client.name ?? '', email: client.email ?? '',
                phone: client.phone ?? '', address: client.address ?? '',
                vatNumber: client.vatNumber ?? '' }
           : EMPTY()
  );
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function field(id, label, type = 'text', required = false) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}{required && ' *'}</Label>
        <Input
          id={id}
          type={type}
          value={form[id]}
          onChange={(e) => set(id, e.target.value)}
          required={required}
        />
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast({ title: 'Name and email are required', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await clientApi.updateClient(client.id, form);
        toast({ title: 'Client updated' });
      } else {
        await clientApi.createClient(form);
        toast({ title: 'Client created' });
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
          <DialogTitle>{isEdit ? 'Edit Client' : 'Add Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field('name',      'Full Name / Company', 'text',  true)}
          {field('email',     'Email',               'email', true)}
          {field('phone',     'Phone',               'tel'        )}
          {field('address',   'Address'                           )}
          {field('vatNumber', 'VAT Number'                        )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [search, setSearch]           = useState('');
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  const { data: raw, isLoading, error, refetch } = useFetch(
    () => clientApi.getClients({ limit: 200 })
  );

  const clients = normalizeList(raw);
  const displayed = search.trim()
    ? clients.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  function openCreate() { setEditTarget(null); setDialogOpen(true); }
  function openEdit(c)  { setEditTarget(c);    setDialogOpen(true); }
  function closeDialog(){ setDialogOpen(false); setEditTarget(null); }

  async function handleDelete() {
    setDeleting(true);
    try {
      await clientApi.deleteClient(deleteTarget);
      toast({ title: 'Client deleted' });
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
        title="Client Manager"
        description="Manage your client directory"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        }
      />

      {/* Search */}
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error}</p>
          ) : displayed.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start creating invoices."
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Client</Button>}
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
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
                            onClick={() => setDeleteTarget(c.id)}
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

      <ClientDialog open={dialogOpen} onClose={closeDialog} client={editTarget} onSaved={refetch} />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete client?"
        description="This client will be permanently removed. Associated invoices won't be deleted."
      />
    </div>
  );
}
