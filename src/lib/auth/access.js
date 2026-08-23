export const PROTECTED_PATHS = [
  '/admin',
  '/dashboard',
  '/invoices',
  '/clients',
  '/business',
  '/bank-accounts',
  '/password',
  '/change-password',
  '/roles',
  '/users',
];

export const ROUTE_PERMISSIONS = [
  { path: '/admin/products', permission: 'product.read' },
  { path: '/invoices', permission: 'invoice.read' },
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
  return ROUTE_PERMISSIONS.find(({ path }) => isPathMatch(pathname, path))?.permission ?? null;
}
