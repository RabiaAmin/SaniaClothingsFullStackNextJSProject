export const PRODUCTION_ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function productionOrderStatusLabel(status) {
  return status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function productionOrderStatusVariant(status) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'default';
  if (status === 'CANCELLED') return 'destructive';
  return 'warning';
}
