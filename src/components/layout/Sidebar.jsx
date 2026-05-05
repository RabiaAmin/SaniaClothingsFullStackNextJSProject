'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  CreditCard,
  KeyRound,
  Package,
  LogOut,
  Loader2,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Invoice Manager', icon: FileText },
  { href: '/clients', label: 'Client Manager', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/business', label: 'Business Profile', icon: Building2 },
  { href: '/bank-accounts', label: 'Bank Accounts', icon: CreditCard },
  { href: '/password', label: 'Password Manager', icon: KeyRound },
];

export default function Sidebar({ open = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      toast({ title: 'Signed out', description: 'See you next time!' });
      router.push('/login');
    } catch {
      toast({ title: 'Sign-out failed', variant: 'destructive' });
    } finally {
      setLoggingOut(false);
    }
  }

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user?.email?.[0]?.toUpperCase() ?? 'U');

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : (user?.email ?? 'User');

  return (
    <aside
      className={cn(
        // Mobile: fixed overlay, slides in/out
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar',
        'transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
        // Desktop: always visible as part of flex row
        'md:static md:translate-x-0'
      )}
    >
      {/* Header / Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
          <Zap className="h-5 w-5 text-sidebar-primary" />
          <span className="font-bold text-sidebar-foreground">Invoicer</span>
        </Link>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="rounded-md p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        {/* User chip */}
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">{displayName}</p>
            {user?.firstName && (
              <p className="truncate text-[11px] text-sidebar-foreground/50">{user.email}</p>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 shrink-0" />
          )}
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
