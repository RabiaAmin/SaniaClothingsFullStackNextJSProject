const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionEntry = require('../src/models/productionEntry.model');
const ProductionOrder = require('../src/models/productionOrder.model');

function validEntry(overrides = {}) {
  return new ProductionEntry({
    productionOrder: new mongoose.Types.ObjectId(),
    worker: new mongoose.Types.ObjectId(),
    date: '2026-08-20',
    quantity: 40,
    unitRate: 12.5,
    totalAmount: 0,
    ...overrides,
  });
}

test('production entries calculate snapshotted earnings from quantity and unit rate', async () => {
  const entry = validEntry();
  await entry.validate();

  assert.equal(entry.status, 'PENDING');
  assert.equal(entry.unitRate, 12.5);
  assert.equal(entry.totalAmount, 500);
  assert.equal(ProductionEntry.schema.path('unitRate').options.immutable, true);
  assert.equal(ProductionEntry.schema.path('worker').options.immutable, true);
  assert.equal(ProductionEntry.schema.path('productionOrder').options.immutable, true);
});

test('production entry quantities must be positive whole numbers', async () => {
  await assert.rejects(() => validEntry({ quantity: 0 }).validate(), /at least 1/i);
  await assert.rejects(() => validEntry({ quantity: 2.5 }).validate(), /whole number/i);
});

test('production entry status is limited to pending, approved, or rejected', async () => {
  await assert.rejects(() => validEntry({ status: 'PAID' }).validate(), /not a valid enum value/i);
});

test('approved quantity increment uses an atomic remaining-quantity predicate', async () => {
  const originalFindOneAndUpdate = ProductionOrder.findOneAndUpdate;
  let captured;
  ProductionOrder.findOneAndUpdate = (filter, update, options) => {
    captured = { filter, update, options };
    return Promise.resolve({ approvedQuantity: 120, status: 'COMPLETED' });
  };

  try {
    const session = { id: 'transaction-session' };
    await ProductionOrder.addApprovedQuantity(
      new mongoose.Types.ObjectId(),
      80,
      new mongoose.Types.ObjectId(),
      { session }
    );

    assert.deepEqual(captured.filter.status, { $nin: ['COMPLETED', 'CANCELLED'] });
    assert.deepEqual(captured.filter.$expr.$lte[0], {
      $add: [{ $ifNull: ['$approvedQuantity', 0] }, 80],
    });
    assert.equal(captured.filter.$expr.$lte[1], '$orderedQuantity');
    assert.equal(captured.options.session, session);
    assert.equal(captured.update[0].$set.status.$cond[2], 'IN_PROGRESS');
    assert.equal(captured.update[0].$set.status.$cond[1], 'COMPLETED');
  } finally {
    ProductionOrder.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('approved quantity increments reject invalid quantities before database access', async () => {
  assert.throws(
    () => ProductionOrder.addApprovedQuantity(new mongoose.Types.ObjectId(), 0),
    /positive whole number/i
  );
});
