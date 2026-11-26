'use client';

import Link from 'next/link';
import { Banknote, ClipboardCheck, ClipboardList, Home, PlusCircle, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { isProductionManagerView, isWorkerView } from '@/lib/auth/productionViews';
import { cn } from '@/lib/utils';

// Phone-only (below `md`) bottom navigation for the role-aware PWA. Item visibility is
// permission-derived; the API remains the authorization boundary for every destination.

// Workers are read-only: production is recorded for them by Admin/Production Managers.
const WORKER_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/production-entries', label: 'My Work', icon: ClipboardCheck },
  { href: '/payroll', label: 'Earnings', icon: Banknote, permission: 'payroll.read_own' },
];

// Production Managers manage orders and record verified production from their phones.
const MANAGER_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/production-orders', label: 'Orders', icon: ClipboardList },
  {
    href: '/production-entries?record=true',
    path: '/production-entries/record',
    label: 'Record',
    icon: PlusCircle,
    isAction: true,
  },
  { href: '/production-entries', label: 'Entries', icon: ClipboardCheck },
  { href: '/payroll', label: 'Payroll', icon: Users, permission: 'payroll.read_all' },
];

export default function MobileBottomNavigation() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const workerView = isWorkerView(hasPermission);
  const managerView = !workerView && isProductionManagerView(hasPermission);

  if (!workerView && !managerView) return null;
  const items = workerView ? WORKER_ITEMS : MANAGER_ITEMS;

  return (
    <>
      <div className="h-20 md:hidden" aria-hidden="true" />
      <nav
        aria-label={workerView ? 'Worker navigation' : 'Production navigation'}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur md:hidden"
      >
        <div className="mx-auto flex max-w-lg">
          {items
            .filter(({ permission }) => !permission || hasPermission(permission))
            .map(({ href, path = href, label, icon: Icon, isAction }) => {
              const active =
                !isAction &&
                (pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`)));
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={(event) => {
                    // Already on the entries page: open the record dialog in place.
                    if (isAction && pathname === '/production-entries') {
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
            })}
        </div>
      </nav>
    </>
  );
}
