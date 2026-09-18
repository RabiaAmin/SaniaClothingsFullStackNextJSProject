const test = require('node:test');
const assert = require('node:assert/strict');

const {
  INVOICE_COUNTER_NAME,
  INITIAL_INVOICE_COUNTER_VALUE,
  initializeInvoiceCounter,
  generateInvoiceNumber,
  createInvoiceWithGeneratedNumber,
} = require('../src/services/invoiceNumber.service');
const Counter = require('../src/models/counter.model');

test('the Counter model uses the legacy shared counters collection', () => {
  assert.equal(Counter.collection.collectionName, 'counters');
  assert.equal(Counter.schema.path('name').options.unique, true);
});

function createCounterModel(initialValue = null) {
  let value = initialValue;
  const calls = [];

  return {
    calls,
    get value() {
      return value;
    },
    async findOneAndUpdate(filter, update, options) {
      calls.push({ filter, update, options });

      if (update.$setOnInsert && value === null) {
        value = update.$setOnInsert.value;
      }
      if (update.$inc) {
        value += update.$inc.value;
      }

      return value === null ? null : { name: INVOICE_COUNTER_NAME, value };
    },
  };
}

test('the existing shared invoice Counter is found without resetting its value', async () => {
  const counterModel = createCounterModel(862);

  const counter = await initializeInvoiceCounter(counterModel);

  assert.equal(counter.value, 862);
  assert.equal(counterModel.value, 862);
  assert.deepEqual(counterModel.calls[0].filter, { name: 'invoice' });
  assert.deepEqual(counterModel.calls[0].update, {
    $setOnInsert: { name: 'invoice', value: 862 },
  });
  assert.equal(counterModel.calls[0].options.upsert, true);
});

test('a missing shared invoice Counter is initialized to 862 without scanning invoices', async () => {
  const counterModel = createCounterModel();

  const counter = await initializeInvoiceCounter(counterModel);

  assert.equal(counter.value, INITIAL_INVOICE_COUNTER_VALUE);
  assert.equal(counterModel.calls.length, 1);
});

test('a Counter at 862 generates 863 followed by 864, 865, and 866', async () => {
  const counterModel = createCounterModel(862);

  const numbers = [];
  for (let index = 0; index < 4; index += 1) {
    numbers.push(await generateInvoiceNumber(counterModel));
  }

  assert.deepEqual(numbers, ['863', '864', '865', '866']);
  assert.equal(counterModel.value, 866);
});

test('concurrent generation uses atomic Counter increments without duplicates', async () => {
  const counterModel = createCounterModel(862);

  const numbers = await Promise.all(
    Array.from({ length: 25 }, () => generateInvoiceNumber(counterModel))
  );

  assert.equal(new Set(numbers).size, 25);
  assert.deepEqual(
    numbers.map(Number).sort((left, right) => left - right),
    Array.from({ length: 25 }, (_, index) => 863 + index)
  );
  assert.equal(counterModel.value, 887);
  const incrementCalls = counterModel.calls.filter((call) => call.update.$inc);
  assert.equal(incrementCalls.length, 25);
  assert.ok(incrementCalls.every((call) => call.update.$inc.value === 1));
});

test('invoice creation ignores manual numbers and does not query or modify existing invoices', async () => {
  const counterModel = createCounterModel(862);
  const createCalls = [];
  const invoiceModel = {
    create: async (invoice) => {
      createCalls.push(invoice);
      return invoice;
    },
    aggregate: async () => {
      throw new Error('Invoice collection must not be scanned for numbering');
    },
  };

  const invoice = await createInvoiceWithGeneratedNumber(
    { invoiceNumber: '9999', invNo: '10001', poNumber: 'PO-1' },
    invoiceModel,
    counterModel
  );

  assert.equal(createCalls.length, 1);
  assert.equal(invoice.invoiceNumber, '863');
  assert.equal(invoice.poNumber, 'PO-1');
  assert.equal('invNo' in invoice, false);
  assert.equal(counterModel.value, 863);
});
