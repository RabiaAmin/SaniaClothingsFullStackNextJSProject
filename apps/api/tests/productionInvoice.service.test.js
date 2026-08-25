const test = require('node:test');
const assert = require('node:assert/strict');
const Invoice = require('../src/models/invoice.model');
const {
  buildExactPoRegex,
  findInvoiceRelationships,
  normalizePoNumber,
  summarizeInvoices,
} = require('../src/services/productionInvoice.service');

test('PO matching is case-insensitive, whitespace-tolerant, exact, and regex-safe', () => {
  const regex = buildExactPoRegex([' po-10.25 ']);

  assert.equal(normalizePoNumber(' po-10.25 '), 'PO-10.25');
  assert.equal(regex.test('PO-10.25'), true);
  assert.equal(regex.test('  po-10.25  '), true);
  assert.equal(regex.test('PO-10X25'), false);
  assert.equal(regex.test('PREFIX-PO-10.25'), false);
});

test('invoice relationship summaries safely represent zero, one, and multiple matches', () => {
  assert.deepEqual(summarizeInvoices(), {
    state: 'NONE',
    matchCount: 0,
    statuses: [],
    latestInvoice: null,
    invoices: [],
  });

  const paid = { _id: 'invoice-1', status: 'Paid' };
  assert.equal(summarizeInvoices([paid]).state, 'SINGLE');
  const multiple = summarizeInvoices([paid, { _id: 'invoice-2', status: 'Pending' }]);
  assert.equal(multiple.state, 'MULTIPLE');
  assert.equal(multiple.matchCount, 2);
  assert.deepEqual(multiple.statuses, ['Paid', 'Pending']);
});

test('batch matching groups every possible invoice without assuming one-to-one ownership', async () => {
  const originalFind = Invoice.find;
  let invoiceFilter;
  const matches = [
    { _id: 'invoice-2', poNumber: ' po-1001 ', status: 'Pending' },
    { _id: 'invoice-1', poNumber: 'PO-1001', status: 'Paid' },
    { _id: 'invoice-3', poNumber: 'PO-2002', status: 'Sent' },
  ];

  try {
    Invoice.find = (filter) => {
      invoiceFilter = filter;
      return {
        select() {
          return this;
        },
        sort: async () => matches,
      };
    };

    const relationships = await findInvoiceRelationships(['PO-1001', 'PO-2002', 'PO-3003']);

    assert.equal(invoiceFilter.poNumber.test(' po-1001 '), true);
    assert.equal(relationships.get('PO-1001').state, 'MULTIPLE');
    assert.equal(relationships.get('PO-1001').matchCount, 2);
    assert.equal(relationships.get('PO-2002').state, 'SINGLE');
    assert.equal(relationships.get('PO-3003').state, 'NONE');
  } finally {
    Invoice.find = originalFind;
  }
});
