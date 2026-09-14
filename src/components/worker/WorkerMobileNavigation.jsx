'use client';

import Link from 'next/link';
import { ClipboardList, Home, PlusCircle, UserRound } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/production-orders', label: 'My Work', icon: ClipboardList },
  {
    href: '/production-entries?record=true',
    path: '/production-entries',
    label: 'Add Work',
    icon: PlusCircle,
    permission: 'production_entry.create',
  },
  { href: '/password', label: 'Profile', icon: UserRound },
];

export default function WorkerMobileNavigation() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const isWorker =
    hasPermission('production_entry.read_own') && !hasPermission('production_entry.read_all');

  if (!isWorker) return null;

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <nav
        aria-label="Worker navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-lg">
          {ITEMS.filter(({ permission }) => !permission || hasPermission(permission)).map(
            ({ href, path = href, label, icon: Icon }) => {
              const active =
                pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={(event) => {
                    if (label === 'Add Work' && pathname === '/production-entries') {
                      event.preventDefault();
                      window.dispatchEvent(new Event('open-production-entry'));
                    }
                  }}
                  className={cn(
                    'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </Link>
              );
            }
          )}
        </div>
      </nav>
    </>
  );
}
