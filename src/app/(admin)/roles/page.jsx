'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Power, PowerOff, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  useCreateRole,
  useDeleteRole,
  usePermissions,
  useRoleUsers,
  useRoles,
  useUpdateRole,
} from '@/hooks/useRoles';
import { toast } from '@/hooks/useToast';
import PermissionGuard from '@/components/auth/PermissionGuard';
import PageHeader from '@/components/admin/PageHeader';
import EmptyState from '@/components/admin/EmptyState';
import TableSkeleton from '@/components/admin/TableSkeleton';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const EMPTY_ROLE = { name: '', slug: '', description: '', permissionIds: [] };

function RoleUsersDialog({ role, onClose }) {
  const { data, isLoading, error } = useRoleUsers(role?._id);
  const users = data?.users ?? [];

  return (
    <Dialog open={Boolean(role)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Users assigned to {role?.name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users assigned"
            description="Assign this role from the User Access page."
          />
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.isActive === false ? 'destructive' : 'default'}>
                        {user.isActive === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function RoleDialog({ open, onClose, role, permissions }) {
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const [form, setForm] = useState(EMPTY_ROLE);
  const isEdit = Boolean(role);

  useEffect(() => {
    setForm(
      role
        ? {
            name: role.name,
            slug: role.slug,
            description: role.description ?? '',
            permissionIds: (role.permissions ?? []).map((permission) => permission._id),
          }
        : EMPTY_ROLE
    );
  }, [role, open]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((groups, permission) => {
      const resource = permission.resource === '*' ? 'System' : permission.resource;
      groups[resource] = [...(groups[resource] ?? []), permission];
      return groups;
    }, {});
  }, [permissions]);

  function togglePermission(id) {
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(id)
        ? current.permissionIds.filter((permissionId) => permissionId !== id)
        : [...current.permissionIds, id],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: 'Role name and slug are required', variant: 'destructive' });
      return;
    }

    try {
      if (isEdit) {
        await updateRole.mutateAsync({
          id: role._id,
          payload: {
            name: form.name,
            description: form.description,
            permissionIds: form.permissionIds,
          },
        });
      } else {
        await createRole.mutateAsync(form);
      }
      toast({ title: isEdit ? 'Role updated' : 'Role created' });
      onClose();
    } catch (error) {
      toast({ title: error.message ?? 'Could not save role', variant: 'destructive' });
    }
  }

  const saving = createRole.isPending || updateRole.isPending;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="roleName">Name</Label>
              <Input
                id="roleName"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                    ...(!isEdit ? { slug: slugify(event.target.value) } : {}),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roleSlug">Slug</Label>
              <Input
                id="roleSlug"
                value={form.slug}
                disabled={isEdit}
                onChange={(event) =>
                  setForm((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roleDescription">Description</Label>
            <Textarea
              id="roleDescription"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          <div className="space-y-3">
            <div>
              <Label>Permissions</Label>
              <p className="text-xs text-muted-foreground">
                Resource wildcards include every action for that resource.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(groupedPermissions).map(([resource, items]) => (
                <div key={resource} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold capitalize">
                    {resource.replaceAll('_', ' ')}
                  </p>
                  <div className="space-y-2">
                    {items.map((permission) => (
                      <label key={permission._id} className="flex cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                          checked={form.permissionIds.includes(permission._id)}
                          onChange={() => togglePermission(permission._id)}
                        />
                        <span>
                          <span className="block font-mono text-xs">{permission.key}</span>
                          <span className="block text-xs text-muted-foreground">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const { data: roleData, isLoading: rolesLoading, error: rolesError } = useRoles();
  const { data: permissionData, isLoading: permissionsLoading } = usePermissions();
  const deleteRole = useDeleteRole();
  const updateRole = useUpdateRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [usersTarget, setUsersTarget] = useState(null);

  const roles = roleData?.roles ?? [];
  const permissions = permissionData?.permissions ?? [];
  const isLoading = rolesLoading || permissionsLoading;

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(role) {
    setEditTarget(role);
    setDialogOpen(true);
  }

  async function handleDelete() {
    try {
      await deleteRole.mutateAsync(deleteTarget._id);
      toast({ title: 'Role deleted' });
    } catch (error) {
      toast({ title: error.message ?? 'Could not delete role', variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleStatusChange() {
    try {
      await updateRole.mutateAsync({
        id: statusTarget._id,
        payload: { isActive: statusTarget.isActive === false },
      });
      toast({ title: statusTarget.isActive === false ? 'Role activated' : 'Role deactivated' });
    } catch (error) {
      toast({ title: error.message ?? 'Could not update role status', variant: 'destructive' });
    } finally {
      setStatusTarget(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Configure reusable access policies for internal users"
        action={
          <PermissionGuard permission="role.create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Create Role
            </Button>
          </PermissionGuard>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={6} />
            </div>
          ) : rolesError ? (
            <p className="p-6 text-sm text-destructive">{rolesError.message}</p>
          ) : roles.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No roles found"
              description="Create a role to configure access."
              className="m-6"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role._id}>
                    <TableCell>
                      <div className="font-medium">{role.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{role.slug}</div>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {role.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive === false ? 'destructive' : 'default'}>
                        {role.isActive === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUsersTarget(role)}
                        aria-label={`View users assigned to ${role.name}`}
                      >
                        <Users className="h-4 w-4" /> {role.assignedUserCount ?? 0}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-md flex-wrap gap-1">
                        {(role.permissions ?? []).map((permission) => (
                          <Badge
                            key={permission._id}
                            variant="secondary"
                            className="font-mono text-[10px]"
                          >
                            {permission.key}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {role.slug !== 'admin' && (
                        <div className="flex justify-end gap-1">
                          <PermissionGuard permission="role.update">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(role)}
                              aria-label={`Edit ${role.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
                          {!role.isSystem && (
                            <>
                              <PermissionGuard permission="role.update">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setStatusTarget(role)}
                                  aria-label={`${role.isActive === false ? 'Activate' : 'Deactivate'} ${role.name}`}
                                >
                                  {role.isActive === false ? (
                                    <Power className="h-4 w-4" />
                                  ) : (
                                    <PowerOff className="h-4 w-4" />
                                  )}
                                </Button>
                              </PermissionGuard>
                              <PermissionGuard permission="role.delete">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteTarget(role)}
                                  aria-label={`Delete ${role.name}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </PermissionGuard>
                            </>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        role={editTarget}
        permissions={permissions}
      />
      <RoleUsersDialog role={usersTarget} onClose={() => setUsersTarget(null)} />
      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
        loading={updateRole.isPending}
        title={statusTarget?.isActive === false ? 'Activate this role?' : 'Deactivate this role?'}
        confirmLabel={statusTarget?.isActive === false ? 'Activate' : 'Deactivate'}
        description={
          statusTarget?.isActive === false
            ? 'The role can be assigned to users again.'
            : 'A role can only be deactivated after all assigned users have been reassigned.'
        }
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteRole.isPending}
        title="Delete custom role?"
        description="The role will be permanently removed. Assigned roles cannot be deleted."
      />
    </div>
  );
}
