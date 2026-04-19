/**
 * Shared formatting utilities.
 * Pure functions — no side effects, no imports.
 */

/**
 * Format a number as currency.
 * @param {number} amount
 * @param {string} currency – ISO 4217 code, default "ZAR"
 * @param {string} locale
 */
export function formatCurrency(amount, currency = 'ZAR', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format an ISO 8601 date string for display.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} options
 */
export function formatDate(date, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
}

/**
 * Return a human-readable relative time string (e.g. "3 days ago").
 * @param {string|Date} date
 */
export function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const MINUTE = 60_000;
  const HOUR = 3_600_000;
  const DAY = 86_400_000;

  if (Math.abs(diff) < MINUTE) return 'just now';
  if (Math.abs(diff) < HOUR) return rtf.format(-Math.round(diff / MINUTE), 'minute');
  if (Math.abs(diff) < DAY) return rtf.format(-Math.round(diff / HOUR), 'hour');
  return rtf.format(-Math.round(diff / DAY), 'day');
}

/**
 * Truncate a string to a max length, appending "…".
 * @param {string} str
 * @param {number} max
 */
export function truncate(str, max = 50) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/**
 * Convert a snake_case or SCREAMING_SNAKE string to Title Case.
 * @param {string} str
 */
export function titleCase(str) {
  return str
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Pad an invoice number to a fixed width.
 * @param {number} n
 * @param {number} width
 */
export function formatInvoiceNumber(n, width = 4) {
  return `INV-${String(n).padStart(width, '0')}`;
}
