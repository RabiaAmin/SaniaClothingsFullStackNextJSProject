export const PRODUCTION_ENTRY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

export function productionEntryStatusLabel(status) {
  return status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown';
}

export function productionEntryStatusVariant(status) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  return 'warning';
}
