/**
 * Reusable validation helpers.
 * Return true when valid, a string error message when invalid.
 */

/** @param {string} value */
export function validateEmail(value) {
  if (!value) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
  return true;
}

/**
 * Minimum 8 chars, at least one letter and one number.
 * @param {string} value
 */
export function validatePassword(value) {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(value)) return 'Password must contain at least one letter';
  if (!/\d/.test(value)) return 'Password must contain at least one number';
  return true;
}

/** @param {string} value */
export function validateRequired(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return 'This field is required';
  }
  return true;
}

/**
 * Ensure a value is a positive number.
 * @param {number|string} value
 */
export function validatePositiveNumber(value) {
  const n = Number(value);
  if (isNaN(n)) return 'Must be a number';
  if (n <= 0) return 'Must be greater than 0';
  return true;
}

/**
 * Validate an ISO date string is not in the past.
 * @param {string} value – ISO 8601 date
 */
export function validateFutureDate(value) {
  if (!value) return 'Date is required';
  if (new Date(value) < new Date()) return 'Date must be in the future';
  return true;
}
