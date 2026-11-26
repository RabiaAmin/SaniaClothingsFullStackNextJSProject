export const PRODUCTION_ENTRY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

export function productionEntryStatusLabel(status) {
  return status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Unknown';
}

export function productionEntryStatusVariant(status) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'destructive';
  return 'warning';
}

// Production is recorded by Admin/Production Managers on a worker's behalf and approved
// immediately, so recording needs both permissions (mirrors the API route guard).
export const RECORD_PRODUCTION_PERMISSIONS = [
  'production_entry.create',
  'production_entry.approve',
];

export function canRecordProduction(hasPermission) {
  return RECORD_PRODUCTION_PERMISSIONS.every((permission) => hasPermission(permission));
}

// Reversal is an approval-level correction with the same backend guard as recording.
export const canReverseProduction = canRecordProduction;

export function isReversalEntry(entry) {
  return entry?.entryType === 'REVERSAL';
}

export function canReverseEntry(entry, userId) {
  const workerId = entry?.worker?._id ?? entry?.worker;
  return (
    entry?.status === 'APPROVED' &&
    !isReversalEntry(entry) &&
    !entry?.reversedAt &&
    String(workerId) !== String(userId)
  );
}

// Local calendar date (YYYY-MM-DD) for date inputs; toISOString() would use UTC and can be a
// day behind for users east of UTC shortly after midnight.
export function localDateInputValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Stored production dates are UTC-midnight calendar days.
export function storedDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}
