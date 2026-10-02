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
