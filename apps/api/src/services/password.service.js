const MINIMUM_PASSWORD_LENGTH = 8;

// Initial password for every Admin-created account, regardless of role:
// the username with all whitespace removed, followed by `123#`. The stored username is
// not changed, the User pre-save hook stores only the bcrypt hash, and the account is
// usable immediately; changing the password later is voluntary.
function generateInitialPassword(username) {
  return `${String(username).replace(/\s/g, '')}123#`;
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
  generateInitialPassword,
  validatePermanentPassword,
};
