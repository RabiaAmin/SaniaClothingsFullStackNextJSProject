'use client';

import { useState } from 'react';
import authApi from '@/lib/api/auth.api';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

const RULES = [
  { label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { label: 'Contains a letter', test: (v) => /[a-zA-Z]/.test(v) },
  { label: 'Contains a number', test: (v) => /\d/.test(v) },
];

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function PasswordPage() {
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState({ current: false, newP: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (k === 'newPassword') setTouched(true);
    setError('');
    setSuccess(false);
  }

  function toggle(k) {
    setShow((p) => ({ ...p, [k]: !p[k] }));
  }

  const passing = RULES.filter((r) => r.test(form.newPassword)).length;

  function validate() {
    if (!form.currentPassword) return 'Current password is required.';
    for (const rule of RULES) {
      if (!rule.test(form.newPassword)) return `New password: ${rule.label.toLowerCase()}.`;
    }
    if (form.newPassword !== form.confirmPassword) return 'New passwords do not match.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setSaving(true);
    setError('');
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess(true);
      setForm(EMPTY);
      setTouched(false);
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
    } catch (err) {
      setError(err.message ?? 'Failed to update password. Check your current password.');
    } finally {
      setSaving(false);
    }
  }

  function PasswordField({ id, label, valueKey, showKey }) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          <Input
            id={id}
            type={show[showKey] ? 'text' : 'password'}
            autoComplete={showKey === 'current' ? 'current-password' : 'new-password'}
            placeholder="••••••••"
            value={form[valueKey]}
            onChange={(e) => set(valueKey, e.target.value)}
            disabled={saving}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => toggle(showKey)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={show[showKey] ? 'Hide' : 'Show'}
          >
            {show[showKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Password Manager" description="Update your account password" />

      <div className="mx-auto max-w-lg space-y-6">
        {/* Security tip */}
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium">Keep your account secure</p>
            <p className="mt-0.5 text-muted-foreground">
              Use a strong, unique password that you don&apos;t use on any other site.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
            <CardDescription>You will remain signed in after the change.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Success */}
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>Password updated successfully.</AlertDescription>
                </Alert>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <PasswordField
                id="current"
                label="Current Password"
                valueKey="currentPassword"
                showKey="current"
              />

              <div className="border-t pt-4">
                <PasswordField
                  id="newPassword"
                  label="New Password"
                  valueKey="newPassword"
                  showKey="newP"
                />

                {/* Strength indicator */}
                {touched && form.newPassword && (
                  <div className="mt-3 space-y-2">
                    {/* Bar */}
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i < passing
                              ? passing === 1
                                ? 'bg-destructive'
                                : passing === 2
                                  ? 'bg-yellow-400'
                                  : 'bg-green-500'
                              : 'bg-muted'
                          }`}
                        />
                      ))}
                    </div>
                    {/* Rules */}
                    <ul className="space-y-0.5">
                      {RULES.map((rule) => {
                        const ok = rule.test(form.newPassword);
                        return (
                          <li
                            key={rule.label}
                            className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}
                          >
                            <CheckCircle2
                              className={`h-3 w-3 ${ok ? 'opacity-100' : 'opacity-30'}`}
                            />
                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <PasswordField
                id="confirmPassword"
                label="Confirm New Password"
                valueKey="confirmPassword"
                showKey="confirm"
              />
              {form.confirmPassword && (
                <p
                  className={`-mt-3 text-xs ${
                    form.newPassword === form.confirmPassword
                      ? 'text-green-600'
                      : 'text-destructive'
                  }`}
                >
                  {form.newPassword === form.confirmPassword
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
