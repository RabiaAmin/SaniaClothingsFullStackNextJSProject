'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Mail } from 'lucide-react';

import authApi from '@/lib/api/auth.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      setSubmitted(true);
    } catch (err) {
      // Show a generic message to prevent email enumeration
      setSubmitted(true);
      // Optionally log: console.warn(err)
      void err;
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Check your inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              If <span className="font-medium text-foreground">{email}</span> is registered,
              you&apos;ll receive a reset link within a few minutes.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get it? Check your spam folder or{' '}
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              className="text-primary underline-offset-4 hover:underline"
            >
              try again
            </button>
            .
          </p>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-3.5 w-3.5" /> Back to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Form state ────────────────────────────────────────────────────────────
  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
        <CardDescription>Enter your email and we&apos;ll send a link to reset it.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending link…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </form>

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
