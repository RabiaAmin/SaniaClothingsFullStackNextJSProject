'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound, Loader2, LogOut } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import authApi from '@/lib/api/auth.api';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validatePassword(form) {
  if (!form.currentPassword) return 'Your temporary password is required.';
  if (form.newPassword.length < 8) return 'New password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(form.newPassword)) return 'New password must contain a letter.';
  if (!/\d/.test(form.newPassword)) return 'New password must contain a number.';
  if (form.newPassword !== form.confirmPassword) return 'New passwords do not match.';
  if (form.currentPassword === form.newPassword) {
    return 'Your new password must be different from the temporary password.';
  }
  return null;
}

function RequiredPasswordForm() {
  const router = useRouter();
  const { logout, setUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validatePassword(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmPassword,
      });
      setUser((current) => ({ ...current, mustChangePassword: false }));
      toast({ title: 'Password changed', description: 'Your account is ready to use.' });
      router.replace('/dashboard');
    } catch (requestError) {
      setError(requestError.message ?? 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle>Choose your password</CardTitle>
          <CardDescription className="mt-1">
            Your administrator issued a temporary password. Replace it before continuing.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current or temporary password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(event) => updateField('currentPassword', event.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(event) => updateField('newPassword', event.target.value)}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Use at least 8 characters, including a letter and a number.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) => updateField('confirmPassword', event.target.value)}
              disabled={saving}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Change Password
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <RequiredPasswordForm />
    </AuthGuard>
  );
}
