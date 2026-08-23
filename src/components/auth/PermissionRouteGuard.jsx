'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { requiredPermissionForPath } from '@/lib/auth/access';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PermissionRouteGuard({ children }) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const requiredPermission = requiredPermissionForPath(pathname);

  if (!requiredPermission || hasPermission(requiredPermission)) return children;

  return (
    <Card className="mx-auto mt-12 max-w-lg">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 rounded-full bg-destructive/10 p-3">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role does not include permission to view this area.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
