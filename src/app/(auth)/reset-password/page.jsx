'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

import authApi from '@/lib/api/auth.api';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ── Inner form — uses useSearchParams (needs Suspense boundary) ───────────────
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  }

  // No token in URL — show a helpful message
  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold">Invalid or expired link</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This password-reset link is missing a token. Please request a new one.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.password) {
      setError('Please enter a new password.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password: formData.password });
      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
      });
      router.push('/login');
    } catch (err) {
      setError(err.message ?? 'Could not reset your password. The link may have expired.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordOk = formData.password.length >= 8;
  const passwordsMatch =
    formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isSubmitting}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {formData.password && (
          <p
            className={`flex items-center gap-1 text-xs ${passwordOk ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            <CheckCircle2 className={`h-3 w-3 ${passwordOk ? 'opacity-100' : 'opacity-30'}`} />
            At least 8 characters
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isSubmitting}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {formData.confirmPassword && (
          <p
            className={`flex items-center gap-1 text-xs ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}
          >
            <CheckCircle2 className={`h-3 w-3 ${passwordsMatch ? 'opacity-100' : 'opacity-30'}`} />
            {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password…
          </>
        ) : (
          'Update password'
        )}
      </Button>
    </form>
  );
}

// ── Page export — wraps form in Suspense (required for useSearchParams) ───────
export default function ResetPasswordPage() {
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Set a new password</CardTitle>
        <CardDescription>Enter and confirm your new password below.</CardDescription>
      </CardHeader>

      <CardContent>
        <Suspense
          fallback={
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>

        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
