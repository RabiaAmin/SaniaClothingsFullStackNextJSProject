'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Bell, Search, Menu } from 'lucide-react';

/**
 * Navbar renders two modes:
 *  - variant="public"  → marketing header with sign-in / get-started CTAs
 *  - variant="admin"   → app top-bar with notifications and user avatar
 */
export default function Navbar({ variant = 'admin' }) {
  const pathname = usePathname();

  if (variant === 'public') {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <span className="text-xl">⚡</span> Invoicer
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {[
              { href: '/about', label: 'About' },
              { href: '/pricing', label: 'Pricing' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-muted-foreground transition-colors hover:text-foreground',
                  pathname === href && 'text-foreground font-medium'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Admin top-bar
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-6">
      <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent md:hidden">
        <Menu className="h-5 w-5" />
      </button>

      {/* Global search placeholder */}
      <div className="flex flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
        <Search className="h-4 w-4" />
        <span>Search invoices, clients…</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {/* Notification badge */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* Avatar placeholder — wire up to AuthContext */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          U
        </button>
      </div>
    </header>
  );
}
