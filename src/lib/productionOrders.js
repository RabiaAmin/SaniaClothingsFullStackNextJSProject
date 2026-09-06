export const PRODUCTION_ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export function productionOrderStatusLabel(status) {
  if (!status) return 'Unknown';
  return status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function productionOrderStatusVariant(status) {
  if (status === 'COMPLETED') return 'success';
  if (status === 'IN_PROGRESS') return 'default';
  if (['CANCELLED', 'OVERDUE'].includes(status)) return 'destructive';
  if (status === 'NOT_STARTED') return 'secondary';
  return 'warning';
}

export function productionOrderTracking(order = {}) {
  const orderedQuantity = Math.max(0, Number(order.orderedQuantity) || 0);
  const producedQuantity = Math.max(
    0,
    Number(order.producedQuantity ?? order.approvedQuantity) || 0
  );
  const remainingQuantity = Math.max(
    0,
    Number(order.remainingQuantity ?? orderedQuantity - producedQuantity) || 0
  );
  const fallbackPercentage = orderedQuantity
    ? Math.round((producedQuantity / orderedQuantity) * 100)
    : 0;
  const progressPercentage = Math.min(
    100,
    Math.max(0, Number(order.progressPercentage ?? fallbackPercentage) || 0)
  );
  const deadline = order.productionDeadline ? new Date(order.productionDeadline) : null;
  const productionDeadline =
    deadline && !Number.isNaN(deadline.getTime()) ? order.productionDeadline : null;

  return {
    orderedQuantity,
    producedQuantity,
    remainingQuantity,
    progressPercentage,
    productionDeadline,
    status: order.calculatedStatus ?? order.status ?? 'NOT_STARTED',
    deadlineStatus: order.deadlineStatus ?? null,
  };
}

export function productionOrderProgressColor(order) {
  const tracking = productionOrderTracking(order);
  if (tracking.status === 'COMPLETED') return 'bg-green-600';
  if (tracking.status === 'OVERDUE') return 'bg-destructive';
  if (tracking.deadlineStatus === 'DUE_SOON') return 'bg-yellow-500';
  return 'bg-primary';
}
