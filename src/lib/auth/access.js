export const PROTECTED_PATHS = [
  '/admin',
  '/dashboard',
  '/invoices',
  '/production-orders',
  '/production-entries',
  '/payroll',
  '/notifications',
  '/clients',
  '/business',
  '/bank-accounts',
  '/password',
  '/change-password',
  '/roles',
  '/users',
];

export const ROUTE_PERMISSIONS = [
  { path: '/admin/products/create', permission: 'product.create' },
  { match: /^\/admin\/products\/[^/]+\/edit$/, permission: 'product.update' },
  { path: '/admin/products', permission: 'product.read' },
  { path: '/invoices/create', permission: 'invoice.create' },
  { match: /^\/invoices\/[^/]+\/edit$/, permission: 'invoice.update' },
  { path: '/invoices', permission: 'invoice.read' },
  { path: '/production-orders/create', permission: 'production_order.create' },
  { match: /^\/production-orders\/[^/]+\/edit$/, permission: 'production_order.update' },
  { path: '/production-orders', permission: 'production_order.read' },
  {
    path: '/production-entries',
    permission: ['production_entry.read_own', 'production_entry.read_all'],
  },
  { path: '/payroll', permission: ['payroll.read_own', 'payroll.read_all'] },
  { path: '/clients', permission: 'client.read' },
  { path: '/business', permission: 'business.read' },
  { path: '/bank-accounts', permission: 'bank_account.read' },
  { path: '/roles', permission: 'role.read' },
  { path: '/users', permission: 'user.read' },
];

export function isPathMatch(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isProtectedPath(pathname) {
  return PROTECTED_PATHS.some((path) => isPathMatch(pathname, path));
}

export function requiredPermissionForPath(pathname) {
  return (
    ROUTE_PERMISSIONS.find(({ path, match }) =>
      match ? match.test(pathname) : isPathMatch(pathname, path)
    )?.permission ?? null
  );
}
