export function notificationTarget(notification) {
  if (notification?.productionEntry) return '/production-entries';
  const orderId = notification?.productionOrder?._id ?? notification?.productionOrder;
  return orderId ? `/production-orders/${orderId}` : '/notifications';
}

export function notificationTypeLabel(type) {
  if (type === 'PRODUCTION_ENTRY_SUBMITTED') return 'Production submitted';
  if (type === 'PRODUCTION_ENTRY_APPROVED') return 'Production approved';
  if (type === 'PRODUCTION_ENTRY_REJECTED') return 'Production rejected';
  if (type === 'PRODUCTION_ORDER_ASSIGNED') return 'Production order assigned';
  return 'Notification';
}
