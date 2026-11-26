const test = require('node:test');
const assert = require('node:assert/strict');
const User = require('../src/models/user.model');
const {
  generateInitialPassword,
  validatePermanentPassword,
} = require('../src/services/password.service');

test('initial passwords remove username whitespace before adding the simple suffix', () => {
  assert.equal(generateInitialPassword('asif'), 'asif123#');
  assert.equal(generateInitialPassword('asif 222'), 'asif222123#');
  assert.equal(generateInitialPassword('shahzad ali'), 'shahzadali123#');
  assert.equal(generateInitialPassword('john   smith'), 'johnsmith123#');
});

test('initial passwords are deterministic and satisfy permanent password rules', () => {
  assert.equal(generateInitialPassword('pm one'), generateInitialPassword('pm one'));
  assert.equal(validatePermanentPassword(generateInitialPassword('pm one')), null);
});

test('initial password generation leaves the User document username unchanged for persistence', async () => {
  const user = new User({
    username: 'shahzad ali',
    email: 'shahzad@example.com',
    phone: '+27 82 555 0102',
    password: generateInitialPassword('shahzad ali'),
    aboutMe: 'Internal user account',
  });

  assert.equal(generateInitialPassword(user.username), 'shahzadali123#');
  await user.validate();
  assert.equal(user.username, 'shahzad ali');
  assert.equal(user.toObject().username, 'shahzad ali');
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
