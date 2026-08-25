const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex } = require('../src/utils/query');

test('user-controlled search text is treated as literal regex content', () => {
  const escaped = escapeRegex('PO-(100)+[test].*');
  const pattern = new RegExp(escaped, 'i');

  assert.equal(pattern.test('PO-(100)+[test].*'), true);
  assert.equal(pattern.test('PO-100test-anything'), false);
});
