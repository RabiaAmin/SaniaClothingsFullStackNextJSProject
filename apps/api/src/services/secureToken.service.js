const crypto = require('crypto');

function encryptionKey() {
  const configured = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY || '';
  let key;
  if (/^[a-f\d]{64}$/i.test(configured)) key = Buffer.from(configured, 'hex');
  else key = Buffer.from(configured, 'base64');
  if (key.length !== 32) {
    throw new Error('GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes');
  }
  return key;
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptSecret(value) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(value.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret };
