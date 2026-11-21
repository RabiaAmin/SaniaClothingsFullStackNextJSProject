const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parsePrice,
  getPriceByItemCode,
  priceNewInvoiceItems,
  priceUpdatedInvoiceItems,
  calculateInvoiceTotals,
} = require('../src/services/cmtPrice.service');

function priceModel(entries) {
  return {
    async findOne({ itemCode }) {
      return entries[itemCode] ?? null;
    },
  };
}

test('price parsing accepts decimal comma input without storing strings', () => {
  assert.equal(parsePrice('45,75', 'CMT price'), 45.75);
  assert.throws(() => parsePrice('-1', 'CMT price'), /zero or greater/i);
  assert.throws(() => parsePrice('not-a-number', 'CMT price'), /valid number/i);
});

test('active Item Code lookup distinguishes missing and inactive entries', async () => {
  const model = priceModel({ OLD1: { itemCode: 'OLD1', isActive: false } });
  await assert.rejects(
    () => getPriceByItemCode('missing', { model }),
    /not found in CMT Price List/i
  );
  await assert.rejects(() => getPriceByItemCode('old1', { model }), /currently inactive/i);
});

test('new invoice items use current CMT prices and server-calculated amounts', async () => {
  const model = priceModel({
    JAWIR9E: { itemCode: 'JAWIR9E', cmtPrice: 55, workerPrice: 30, isActive: true },
  });
  const items = await priceNewInvoiceItems(
    [{ description: ' jawir9e ', quantity: 110, unitPrice: 999, amount: 1 }],
    { model }
  );
  assert.deepEqual(items, [{ description: 'JAWIR9E', quantity: 110, unitPrice: 55, amount: 6050 }]);
});

test('invoice edits preserve snapshots unless the Item Code changes', async () => {
  const model = priceModel({
    JAWIR9E: { itemCode: 'JAWIR9E', cmtPrice: 60, isActive: true },
    NEW1: { itemCode: 'NEW1', cmtPrice: 42.5, isActive: true },
  });
  const existing = [{ description: 'JAWIR9E', quantity: 110, unitPrice: 55, amount: 6050 }];

  const unchanged = await priceUpdatedInvoiceItems(
    existing,
    [{ description: 'jawir9e', quantity: 100, unitPrice: 60 }],
    { model }
  );
  assert.equal(unchanged[0].unitPrice, 55);
  assert.equal(unchanged[0].amount, 5500);

  const changed = await priceUpdatedInvoiceItems(
    existing,
    [{ description: 'new1', quantity: 2, unitPrice: 999 }],
    { model }
  );
  assert.equal(changed[0].unitPrice, 42.5);
  assert.equal(changed[0].amount, 85);
});

test('invoice totals retain the existing 15 percent VAT architecture', () => {
  const items = [{ amount: 6050 }, { amount: 50 }];
  assert.deepEqual(calculateInvoiceTotals(items, 1), {
    subTotal: 6100,
    tax: 915,
    totalAmount: 7015,
  });
  assert.deepEqual(calculateInvoiceTotals(items, 0), {
    subTotal: 6100,
    tax: 0,
    totalAmount: 6100,
  });
});

test('unregistered Item Codes on new invoices use a validated manual unit price', async () => {
  const model = priceModel({
    JAWIR9E: { itemCode: 'JAWIR9E', cmtPrice: 55, isActive: true },
    OLD1: { itemCode: 'OLD1', cmtPrice: 20, isActive: false },
  });
  const items = await priceNewInvoiceItems(
    [
      { description: 'jawir9e', quantity: 10, unitPrice: 999 },
      { description: ' custom1 ', quantity: 3, unitPrice: '12,345' },
    ],
    { model }
  );
  assert.deepEqual(items, [
    { description: 'JAWIR9E', quantity: 10, unitPrice: 55, amount: 550 },
    { description: 'CUSTOM1', quantity: 3, unitPrice: 12.35, amount: 37.05 },
  ]);
  assert.deepEqual(calculateInvoiceTotals(items, 1), {
    subTotal: 587.05,
    tax: 88.06,
    totalAmount: 675.11,
  });

  for (const unitPrice of [undefined, null, '', -1, 'abc']) {
    await assert.rejects(
      () => priceNewInvoiceItems([{ description: 'custom1', quantity: 1, unitPrice }], { model }),
      /unregistered item code CUSTOM1/i
    );
  }
  await assert.rejects(
    () => priceNewInvoiceItems([{ description: 'old1', quantity: 1, unitPrice: 5 }], { model }),
    /currently inactive/i
  );
});

test('invoice edits let unregistered lines keep or correct their manual price', async () => {
  const model = priceModel({
    JAWIR9E: { itemCode: 'JAWIR9E', cmtPrice: 60, isActive: true },
    OLD1: { itemCode: 'OLD1', cmtPrice: 20, isActive: false },
  });
  const existing = [
    { description: 'CUSTOM1', quantity: 2, unitPrice: 15, amount: 30 },
    { description: 'OLD1', quantity: 1, unitPrice: 18, amount: 18 },
  ];

  const corrected = await priceUpdatedInvoiceItems(
    existing,
    [
      { description: 'custom1', quantity: 2, unitPrice: 17.5 },
      { description: 'old1', quantity: 1, unitPrice: 999 },
    ],
    { model }
  );
  assert.equal(corrected[0].unitPrice, 17.5);
  assert.equal(corrected[0].amount, 35);
  assert.equal(corrected[1].unitPrice, 18, 'registered snapshot is preserved even when inactive');

  const omitted = await priceUpdatedInvoiceItems(
    existing,
    [
      { description: 'CUSTOM1', quantity: 4 },
      { description: 'OLD1', quantity: 1 },
    ],
    { model }
  );
  assert.equal(omitted[0].unitPrice, 15, 'stored manual price is kept when none is supplied');

  const switchedToRegistered = await priceUpdatedInvoiceItems(
    existing,
    [{ description: 'jawir9e', quantity: 2, unitPrice: 1 }],
    { model }
  );
  assert.equal(switchedToRegistered[0].unitPrice, 60);

  const switchedToUnregistered = await priceUpdatedInvoiceItems(
    existing,
    [{ description: 'custom2', quantity: 2, unitPrice: 8 }],
    { model }
  );
  assert.equal(switchedToUnregistered[0].unitPrice, 8);
  await assert.rejects(
    () => priceUpdatedInvoiceItems(existing, [{ description: 'custom2', quantity: 2 }], { model }),
    /unregistered item code CUSTOM2 is required/i
  );
});
