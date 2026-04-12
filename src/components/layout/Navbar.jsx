'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu, Zap, Settings, LogOut, User } from 'lucide-react';

export default function Navbar({ variant = 'admin', onMenuClick }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout().catch(() => {});
    toast({ title: 'Signed out' });
    router.push('/login');
  }

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.email?.[0]?.toUpperCase() ?? 'U';

  /* ── Public / marketing navbar ─────────────────────────────────────────── */
  if (variant === 'public') {
    return (
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Zap className="h-4 w-4" /> Invoicer
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {[{ href: '/about', label: 'About' }].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'text-muted-foreground transition-colors hover:text-foreground',
                  pathname === href && 'font-medium text-foreground'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link href="/login">Sign in</Link></Button>
            <Button asChild size="sm"><Link href="/register">Get started</Link></Button>
          </div>
        </div>
      </header>
    );
  }

  /* ── Admin top-bar ──────────────────────────────────────────────────────── */
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 md:px-6">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo — mobile only (sidebar hidden on mobile) */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-bold text-foreground md:hidden"
      >
        <Zap className="h-4 w-4 text-primary" />
        Invoicer
      </Link>

      <div className="flex-1" />

      {/* User avatar + dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium leading-none">
                {user?.firstName ?? user?.email ?? 'User'}
              </p>
              {user?.firstName && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{user?.firstName ?? 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/password" className="cursor-pointer">
              <User className="h-4 w-4" />
              Change Password
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
