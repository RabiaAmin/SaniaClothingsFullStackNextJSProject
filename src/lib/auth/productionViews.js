import { canRecordProduction } from '@/lib/productionEntries';

// Permission-derived presentation modes for the phone PWA (below the `md` breakpoint).
// These choose layouts only; every action is still authorized by the API.

// Workers: own-entry access without all-entry access (read-only production).
export function isWorkerView(hasPermission) {
  return hasPermission('production_entry.read_own') && !hasPermission('production_entry.read_all');
}

// Production managers: see all entries, read orders, and record/approve production, but do not
// administer users. Admin's global wildcard includes `user.read`, so Admin keeps the existing
// layouts unchanged while the default Production Manager role receives the manager phone PWA.
export function isProductionManagerView(hasPermission) {
  return (
    hasPermission('production_entry.read_all') &&
    hasPermission('production_order.read') &&
    canRecordProduction(hasPermission) &&
    !hasPermission('user.read')
  );
}
