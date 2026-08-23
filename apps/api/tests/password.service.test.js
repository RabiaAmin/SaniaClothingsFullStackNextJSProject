const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/user.model');
const {
  generateTemporaryPassword,
  validatePermanentPassword,
} = require('../src/services/password.service');

test('temporary passwords are unique and satisfy permanent password rules', () => {
  const generated = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));

  assert.equal(generated.size, 50);
  for (const password of generated) {
    assert.equal(validatePermanentPassword(password), null);
    assert.ok(password.length >= 8);
  }
});

test('permanent password validation follows existing UI requirements', () => {
  assert.match(validatePermanentPassword('short1'), /at least 8/i);
  assert.match(validatePermanentPassword('12345678'), /letter/i);
  assert.match(validatePermanentPassword('abcdefgh'), /number/i);
  assert.equal(validatePermanentPassword('Secure123'), null);
});

test('existing users default to no required password change', () => {
  const user = new User();
  assert.equal(user.mustChangePassword, false);
});

test('internal users can be validated without an uploaded avatar', async () => {
  const user = new User({
    username: 'worker-user',
    email: 'worker@example.com',
    phone: '+27 82 555 0101',
    password: 'Temporary123',
    aboutMe: 'Internal user account',
  });

  await assert.doesNotReject(() => user.validate());
  assert.equal(user.avatar.public_id, '');
  assert.equal(user.avatar.url, '');
});
