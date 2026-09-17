const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateInvoiceStatements,
  normalizeInvoiceIds,
} = require('../src/services/invoiceStatement.service');

const FIRST_ID = '64b000000000000000000001';
const SECOND_ID = '64b000000000000000000002';

function invoiceModel(records, statements = []) {
  let capturedFilter;
  let capturedPipeline;
  const model = {
    find(filter) {
      capturedFilter = filter;
      return {
        select() {
          return this;
        },
        async lean() {
          return records;
        },
      };
    },
    async aggregate(pipeline) {
      capturedPipeline = pipeline;
      return statements;
    },
  };

  return {
    model,
    getFilter: () => capturedFilter,
    getPipeline: () => capturedPipeline,
  };
}

test('invoice IDs are required, valid, and safely deduplicated', () => {
  assert.throws(() => normalizeInvoiceIds([]), /Select at least one invoice/);
  assert.throws(() => normalizeInvoiceIds(['not-an-id']), /invoice IDs are invalid/);

  const ids = normalizeInvoiceIds([FIRST_ID, FIRST_ID.toUpperCase()]);
  assert.equal(ids.length, 1);
  assert.equal(ids[0].toHexString(), FIRST_ID);
});

test('statement generation rejects missing and non-Sent invoices', async () => {
  const missing = invoiceModel([{ _id: FIRST_ID, status: 'Sent' }]);
  await assert.rejects(
    generateInvoiceStatements([FIRST_ID, SECOND_ID], missing.model),
    (error) => error.statusCode === 404 && /no longer exist/.test(error.message)
  );

  const pending = invoiceModel([{ _id: FIRST_ID, status: 'Pending' }]);
  await assert.rejects(
    generateInvoiceStatements([FIRST_ID], pending.model),
    (error) => error.statusCode === 400 && /Sent status/.test(error.message)
  );
});

test('statement generation matches only selected database IDs and preserves grouping order', async () => {
  const expected = [{ _id: 'Acme', totalInvoices: 2, totalAmount: 300 }];
  const fake = invoiceModel(
    [
      { _id: FIRST_ID, status: 'Sent' },
      { _id: SECOND_ID, status: 'Sent' },
    ],
    expected
  );

  const result = await generateInvoiceStatements([FIRST_ID, SECOND_ID, FIRST_ID], fake.model);
  assert.equal(result, expected);
  assert.equal(fake.getFilter()._id.$in.length, 2);

  const pipeline = fake.getPipeline();
  assert.deepEqual(pipeline[0].$match.status, 'Sent');
  assert.equal(pipeline[0].$match._id.$in.length, 2);
  assert.deepEqual(pipeline[1], { $sort: { date: -1, _id: -1 } });
  assert.deepEqual(pipeline.at(-1), { $sort: { totalAmount: -1 } });
});
