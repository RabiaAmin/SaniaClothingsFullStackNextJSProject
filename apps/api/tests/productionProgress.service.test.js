const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionEntry = require('../src/models/productionEntry.model');
const {
  buildProductionTracking,
  getApprovedQuantities,
  getProductionDeadline,
} = require('../src/services/productionProgress.service');

const beforeDeadline = new Date('2026-06-12T18:00:00.000Z');

function tracking(approvedQuantity, overrides = {}, now = beforeDeadline) {
  return buildProductionTracking(
    {
      orderedQuantity: 100,
      dueDate: '2026-06-15T00:00:00.000Z',
      status: 'IN_PROGRESS',
      ...overrides,
    },
    approvedQuantity,
    now
  );
}

test('production deadline is one UTC calendar day before the client due date', () => {
  assert.equal(
    getProductionDeadline('2026-06-15T00:00:00.000Z').toISOString(),
    '2026-06-14T00:00:00.000Z'
  );
  assert.equal(getProductionDeadline('not-a-date'), null);
});

test('production tracking calculates not-started, in-progress, completed, and overdue states', () => {
  assert.deepEqual(
    {
      status: tracking(0).calculatedStatus,
      produced: tracking(0).producedQuantity,
      remaining: tracking(0).remainingQuantity,
      percentage: tracking(0).progressPercentage,
    },
    { status: 'NOT_STARTED', produced: 0, remaining: 100, percentage: 0 }
  );
  assert.equal(tracking(40).calculatedStatus, 'IN_PROGRESS');
  assert.equal(tracking(40).progressPercentage, 40);
  assert.equal(tracking(100).calculatedStatus, 'COMPLETED');
  assert.equal(tracking(70, {}, new Date('2026-06-15T08:00:00.000Z')).calculatedStatus, 'OVERDUE');
});

test('tracking clamps overproduction and safely handles zero quantities and missing dates', () => {
  const overproduced = tracking(120);
  assert.equal(overproduced.calculatedStatus, 'COMPLETED');
  assert.equal(overproduced.remainingQuantity, 0);
  assert.equal(overproduced.progressPercentage, 100);

  const invalid = tracking(0, { orderedQuantity: 0, dueDate: null });
  assert.equal(invalid.calculatedStatus, 'NOT_STARTED');
  assert.equal(invalid.progressPercentage, 0);
  assert.equal(invalid.productionDeadline, null);
  assert.equal(invalid.deadlineStatus, null);
});

test('deadline warnings are deterministic for overdue, today, and one-day-away deadlines', () => {
  assert.equal(tracking(40, {}, new Date('2026-06-13T12:00:00.000Z')).deadlineStatus, 'DUE_SOON');
  assert.equal(tracking(40, {}, new Date('2026-06-14T23:59:59.000Z')).deadlineStatus, 'DUE_SOON');
  assert.equal(tracking(40, {}, new Date('2026-06-15T00:00:00.000Z')).deadlineStatus, 'OVERDUE');
  assert.equal(tracking(100, {}, new Date('2026-06-15T00:00:00.000Z')).deadlineStatus, null);
});

test('approved totals aggregate all workers while excluding pending and rejected entries', async () => {
  const orderId = new mongoose.Types.ObjectId();
  const originalAggregate = ProductionEntry.aggregate;
  let pipeline;
  ProductionEntry.aggregate = async (receivedPipeline) => {
    pipeline = receivedPipeline;
    return [{ _id: orderId, approvedQuantity: 70 }];
  };

  try {
    const totals = await getApprovedQuantities([orderId]);
    assert.equal(totals.get(String(orderId)), 70);
    assert.equal(pipeline[0].$match.status, 'APPROVED');
    assert.equal(pipeline[1].$group._id, '$productionOrder');
    assert.deepEqual(pipeline[1].$group.approvedQuantity, { $sum: '$quantity' });
    assert.equal(
      pipeline.some((stage) => stage.$match?.worker),
      false
    );
  } finally {
    ProductionEntry.aggregate = originalAggregate;
  }
});
