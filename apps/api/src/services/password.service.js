const crypto = require('crypto');

const MINIMUM_PASSWORD_LENGTH = 8;

function generateTemporaryPassword() {
  return `${crypto.randomBytes(12).toString('base64url')}A1!`;
}

function validatePermanentPassword(password) {
  if (typeof password !== 'string' || password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters long`;
  }
  if (!/[A-Za-z]/.test(password)) return 'Password must contain a letter';
  if (!/\d/.test(password)) return 'Password must contain a number';
  return null;
}

module.exports = {
  MINIMUM_PASSWORD_LENGTH,
  generateTemporaryPassword,
  validatePermanentPassword,
};
