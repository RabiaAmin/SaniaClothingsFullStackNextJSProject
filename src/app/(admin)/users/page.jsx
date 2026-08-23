'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Loader2, Pencil, Plus, Users } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { useCreateUser, useUpdateUserAccess, useUsers } from '@/hooks/useUserAccess';
import { toast } from '@/hooks/useToast';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

const EMPTY_USER = { username: '', email: '', phone: '', aboutMe: '', roleId: '' };

function CreateUserDialog({ open, onClose, roles, onCreated }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState(EMPTY_USER);

  useEffect(() => {
    if (open) setForm(EMPTY_USER);
  }, [open]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.username.trim() || !form.email.trim() || !form.phone.trim() || !form.roleId) {
      toast({ title: 'Name, email, phone, and role are required', variant: 'destructive' });
      return;
    }

    try {
      const result = await createUser.mutateAsync(form);
      onClose();
      onCreated({
        username: result.user.username,
        email: result.user.email,
        temporaryPassword: result.temporaryPassword,
      });
      toast({ title: 'User created' });
    } catch (error) {
      toast({ title: error.message ?? 'Could not create user', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="newUsername">Username</Label>
              <Input
                id="newUsername"
                value={form.username}
                onChange={(event) => updateField('username', event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newUserEmail">Email</Label>
              <Input
                id="newUserEmail"
                type="email"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newUserPhone">Phone</Label>
            <Input
              id="newUserPhone"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newUserNotes">Notes (optional)</Label>
            <Input
              id="newUserNotes"
              value={form.aboutMe}
              onChange={(event) => updateField('aboutMe', event.target.value)}
              placeholder="For example, Cutting department"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.roleId} onValueChange={(value) => updateField('roleId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((role) => role.isActive !== false)
                  .map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A secure temporary password will be generated automatically.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CredentialsDialog({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [credentials]);

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(
        `Email: ${credentials.email}\nTemporary password: ${credentials.temporaryPassword}`
      );
      setCopied(true);
      toast({ title: 'Credentials copied' });
    } catch {
      toast({ title: 'Could not copy credentials', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary Login Credentials</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">
              Copy these details now. The temporary password will not be shown again after this
              dialog is closed.
            </p>
          </div>
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Username</p>
              <p className="break-all font-mono text-sm">{credentials?.username}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="break-all font-mono text-sm">{credentials?.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Temporary password</p>
              <p className="break-all font-mono text-sm">{credentials?.temporaryPassword}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={copyCredentials}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Credentials'}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessDialog({ open, onClose, user, roles }) {
  const updateAccess = useUpdateUserAccess();
  const [roleId, setRoleId] = useState('unassigned');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setRoleId(user?.role?._id ?? 'unassigned');
    setIsActive(user?.isActive !== false);
  }, [user, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      await updateAccess.mutateAsync({
        id: user._id,
        payload: { roleId: roleId === 'unassigned' ? null : roleId, isActive },
      });
      toast({ title: 'User access updated' });
      onClose();
    } catch (error) {
      toast({ title: error.message ?? 'Could not update user access', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage User Access</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="font-medium">{user?.username}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">No role assigned</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role._id} value={role._id} disabled={role.isActive === false}>
                    {role.name}
                    {role.isActive === false ? ' (inactive)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium">Active account</span>
              <span className="block text-xs text-muted-foreground">
                Inactive users cannot log in or use an existing session.
              </span>
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateAccess.isPending}>
              {updateAccess.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { data: userData, isLoading: usersLoading, error } = useUsers();
  const { data: roleData, isLoading: rolesLoading } = useRoles();
  const [editTarget, setEditTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [credentials, setCredentials] = useState(null);

  const users = userData?.users ?? [];
  const roles = roleData?.roles ?? [];
  const isLoading = usersLoading || rolesLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Access"
        description="Assign roles and control access for internal user accounts"
        action={
          <PermissionGuard permission="user.create">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create User
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-destructive">{error.message}</p>
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users found"
              description="Registered users will appear here."
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      {user.role ? (
                        <Badge variant="secondary">{user.role.name}</Badge>
                      ) : (
                        <Badge variant="destructive">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={user.isActive === false ? 'destructive' : 'default'}>
                          {user.isActive === false ? 'Inactive' : 'Active'}
                        </Badge>
                        {user.mustChangePassword && (
                          <Badge variant="outline">Password setup required</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <PermissionGuard permission="user.update">
                        <Button variant="ghost" size="sm" onClick={() => setEditTarget(user)}>
                          <Pencil className="h-4 w-4" /> Manage
                        </Button>
                      </PermissionGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AccessDialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        user={editTarget}
        roles={roles}
      />
      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        roles={roles}
        onCreated={setCredentials}
      />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
