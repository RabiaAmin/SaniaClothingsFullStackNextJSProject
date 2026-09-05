const test = require('node:test');
const assert = require('node:assert/strict');

const {
  numericInvoiceNumberPipeline,
  generateInvoiceNumber,
  createInvoiceWithGeneratedNumber,
  isInvoiceNumberDuplicate,
} = require('../src/services/invoiceNumber.service');

test('invoice number aggregation converts stored strings and numbers before finding the maximum', () => {
  const pipeline = numericInvoiceNumberPipeline();

  assert.deepEqual(pipeline[0], {
    $project: {
      numericInvoiceNumber: {
        $convert: {
          input: '$invoiceNumber',
          to: 'double',
          onError: null,
          onNull: null,
        },
      },
    },
  });
  assert.deepEqual(pipeline.at(-2), { $sort: { numericInvoiceNumber: -1 } });
  assert.deepEqual(pipeline.at(-1), { $limit: 1 });
});

test('the next invoice number is the highest numeric database value plus one', async () => {
  for (const [highest, expected] of [
    [802, '803'],
    [803, '804'],
    [917, '918'],
  ]) {
    const invoiceModel = { aggregate: async () => [{ numericInvoiceNumber: highest }] };
    assert.equal(await generateInvoiceNumber(invoiceModel), expected);
  }
});

test('an empty numeric sequence starts at the existing project convention of one', async () => {
  const invoiceModel = { aggregate: async () => [] };
  assert.equal(await generateInvoiceNumber(invoiceModel), '1');
});

test('invoice numbering rejects values that cannot be safely incremented', async () => {
  const invoiceModel = {
    aggregate: async () => [{ numericInvoiceNumber: Number.MAX_SAFE_INTEGER }],
  };

  await assert.rejects(generateInvoiceNumber(invoiceModel), /outside the supported numeric range/);
});

test('creation ignores client invoice numbers and retries a concurrent duplicate', async () => {
  const generatedNumbers = [802, 803];
  const createCalls = [];
  const invoiceModel = {
    aggregate: async () => [{ numericInvoiceNumber: generatedNumbers.shift() }],
    create: async (invoice) => {
      createCalls.push(invoice);
      if (createCalls.length === 1) {
        const error = new Error('duplicate invoiceNumber');
        error.code = 11000;
        error.keyPattern = { invoiceNumber: 1 };
        throw error;
      }
      return invoice;
    },
  };

  const invoice = await createInvoiceWithGeneratedNumber(
    { invoiceNumber: '9999', invNo: '10001', poNumber: 'PO-1' },
    invoiceModel
  );

  assert.deepEqual(
    createCalls.map((call) => call.invoiceNumber),
    ['803', '804']
  );
  assert.equal(invoice.invoiceNumber, '804');
  assert.equal('invNo' in invoice, false);
});

test('only invoice-number duplicate key errors are eligible for retry', () => {
  assert.equal(isInvoiceNumberDuplicate({ code: 11000, keyValue: { invoiceNumber: '803' } }), true);
  assert.equal(isInvoiceNumberDuplicate({ code: 11000, keyValue: { email: 'x@y.test' } }), false);
  assert.equal(isInvoiceNumberDuplicate(new Error('other failure')), false);
});
