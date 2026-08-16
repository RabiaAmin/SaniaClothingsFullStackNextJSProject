'use client';

import { useState } from 'react';
import authApi from '@/lib/api/auth.api';
import { toast } from '@/hooks/useToast';

import PageHeader from '@/components/admin/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

const RULES = [
  {
    label: 'At least 8 characters',
    test: (value) => value.length >= 8,
  },
  {
    label: 'Contains a letter',
    test: (value) => /[a-zA-Z]/.test(value),
  },
  {
    label: 'Contains a number',
    test: (value) => /\d/.test(value),
  },
];

const EMPTY_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function PasswordPage() {
  const [form, setForm] = useState(EMPTY_FORM);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const passing = RULES.filter((rule) =>
    rule.test(form.newPassword)
  ).length;

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === 'newPassword') {
      setTouched(true);
    }

    setError('');
    setSuccess(false);
  }

  function validate() {
    if (!form.currentPassword) {
      return 'Current password is required.';
    }

    for (const rule of RULES) {
      if (!rule.test(form.newPassword)) {
        return `New password: ${rule.label.toLowerCase()}.`;
      }
    }

    if (form.newPassword !== form.confirmPassword) {
      return 'New passwords do not match.';
    }

    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmPassword,
      });

      setSuccess(true);
      setForm(EMPTY_FORM);
      setTouched(false);

      toast({
        title: 'Password updated',
        description: 'Your password has been changed.',
      });
    } catch (err) {
      setError(
        err.message ??
          'Failed to update password. Check your current password.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Password Manager"
        description="Update your account password"
      />

      <div className="mx-auto max-w-lg space-y-6">
        {/* Security Tip */}
        <div className="flex items-start gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div className="text-sm">
            <p className="font-medium">keep your account secure</p>

            <p className="mt-0.5 text-muted-foreground">
              Use a strong, unique password that you don&apos;t use on any
              other site.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Change Password
            </CardTitle>

            <CardDescription>
              You will remain signed in after the change.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              noValidate
            >
              {/* Success */}
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4" />

                  <AlertDescription>
                    Password updated successfully.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">
                  Current Password
                </Label>

                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.currentPassword}
                    onChange={(e) =>
                      handleChange(
                        'currentPassword',
                        e.target.value
                      )
                    }
                    disabled={saving}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowCurrent((prev) => !prev)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showCurrent ? 'Hide password' : 'Show password'
                    }
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="border-t pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">
                    New Password
                  </Label>

                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={form.newPassword}
                      onChange={(e) =>
                        handleChange(
                          'newPassword',
                          e.target.value
                        )
                      }
                      disabled={saving}
                      className="pr-10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNew((prev) => !prev)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showNew ? 'Hide password' : 'Show password'
                      }
                    >
                      {showNew ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Strength */}
                {touched && form.newPassword && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((index) => (
                        <div
                          key={index}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            index < passing
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

                    <ul className="space-y-0.5">
                      {RULES.map((rule) => {
                        const valid = rule.test(form.newPassword);

                        return (
                          <li
                            key={rule.label}
                            className={`flex items-center gap-1.5 text-xs ${
                              valid
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3 w-3 ${
                                valid ? 'opacity-100' : 'opacity-30'
                              }`}
                            />

                            {rule.label}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">
                  Confirm New Password
                </Label>

                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange(
                        'confirmPassword',
                        e.target.value
                      )
                    }
                    disabled={saving}
                    className="pr-10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirm((prev) => !prev)
                    }
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={
                      showConfirm
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Match */}
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

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating…
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