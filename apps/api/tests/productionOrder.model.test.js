const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionOrder = require('../src/models/productionOrder.model');
const Invoice = require('../src/models/invoice.model');

function validOrder(overrides = {}) {
  const userId = new mongoose.Types.ObjectId();
  return new ProductionOrder({
    poNumber: 'po-2026-001',
    itemCode: 'jk001',
    client: new mongoose.Types.ObjectId(),
    productionDescription: 'Navy work jackets',
    orderedQuantity: 120,
    approvedQuantity: 80,
    workerRate: 12.5,
    startDate: '2026-08-01',
    dueDate: '2026-08-31',
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  });
}

test('production orders normalize globally unique PO keys and expose progress', async () => {
  const order = validOrder();
  await order.validate();

  assert.equal(order.poNumber, 'PO-2026-001');
  assert.equal(order.itemCode, 'JK001');
  assert.equal(order.producedQuantity, 80);
  assert.equal(order.remainingQuantity, 40);
  assert.equal(order.progressPercentage, 67);
  assert.equal(ProductionOrder.schema.path('poNumber').options.unique, true);
});

test('production orders require an item code', async () => {
  const order = validOrder({ itemCode: '   ' });
  await assert.rejects(() => order.validate(), /item code is required/i);
});

test('approved production cannot exceed the ordered quantity', async () => {
  const order = validOrder({ approvedQuantity: 121 });
  await assert.rejects(() => order.validate(), /cannot exceed ordered quantity/i);
});

test('completed production orders require the full approved quantity', async () => {
  const incomplete = validOrder({ status: 'COMPLETED' });
  await assert.rejects(() => incomplete.validate(), /only be completed/i);

  const complete = validOrder({ status: 'COMPLETED', approvedQuantity: 120 });
  await assert.doesNotReject(() => complete.validate());
});

test('due date cannot precede the production start date', async () => {
  const order = validOrder({ startDate: '2026-09-01', dueDate: '2026-08-01' });
  await assert.rejects(() => order.validate(), /before the start date/i);
});

test('production orders and invoices remain independent models', () => {
  assert.equal(ProductionOrder.schema.path('invoice'), undefined);
  assert.equal(Invoice.schema.path('productionOrder'), undefined);
});
