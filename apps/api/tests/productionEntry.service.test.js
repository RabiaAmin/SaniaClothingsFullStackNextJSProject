const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionEntry = require('../src/models/productionEntry.model');
const ProductionOrder = require('../src/models/productionOrder.model');
const { reviewProductionEntry } = require('../src/services/productionEntry.service');

function queryResult(value) {
  return { session: async () => value };
}

async function withMocks({ entry, orderResult }, callback) {
  const originals = {
    startSession: mongoose.startSession,
    findOne: ProductionEntry.findOne,
    findById: ProductionEntry.findById,
    addApprovedQuantity: ProductionOrder.addApprovedQuantity,
  };
  let approvalCall;
  const session = {
    withTransaction: async (work) => work(),
    endSession: async () => {},
  };

  mongoose.startSession = async () => session;
  ProductionEntry.findOne = () => queryResult(entry);
  ProductionEntry.findById = () => queryResult(entry);
  ProductionOrder.addApprovedQuantity = async (...args) => {
    approvalCall = args;
    return orderResult;
  };

  try {
    await callback(() => approvalCall, session);
  } finally {
    mongoose.startSession = originals.startSession;
    ProductionEntry.findOne = originals.findOne;
    ProductionEntry.findById = originals.findById;
    ProductionOrder.addApprovedQuantity = originals.addApprovedQuantity;
  }
}

test('approval updates the order and entry in one transaction', async () => {
  const workerId = new mongoose.Types.ObjectId();
  const reviewerId = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  let savedWith;
  const entry = {
    worker: workerId,
    productionOrder: orderId,
    quantity: 80,
    status: 'PENDING',
    save: async (options) => {
      savedWith = options;
    },
  };

  await withMocks(
    { entry, orderResult: { approvedQuantity: 120 } },
    async (approvalCall, session) => {
      const result = await reviewProductionEntry({
        entryId: new mongoose.Types.ObjectId(),
        reviewerId,
        decision: 'APPROVED',
      });

      assert.equal(result.status, 'APPROVED');
      assert.equal(result.reviewedBy, reviewerId);
      assert.equal(savedWith.session, session);
      assert.equal(approvalCall()[0], orderId);
      assert.equal(approvalCall()[1], 80);
      assert.equal(approvalCall()[2], reviewerId);
      assert.equal(approvalCall()[3].session, session);
    }
  );
});

test('approval rolls back when the claimed quantity exceeds the remaining order quantity', async () => {
  const entry = {
    worker: new mongoose.Types.ObjectId(),
    productionOrder: new mongoose.Types.ObjectId(),
    quantity: 81,
    status: 'PENDING',
    save: async () => assert.fail('An over-production entry must not be saved as approved'),
  };

  await withMocks({ entry, orderResult: null }, async () => {
    await assert.rejects(
      () =>
        reviewProductionEntry({
          entryId: new mongoose.Types.ObjectId(),
          reviewerId: new mongoose.Types.ObjectId(),
          decision: 'APPROVED',
        }),
      (error) => error.statusCode === 409 && /remaining quantity/i.test(error.message)
    );
    assert.equal(entry.status, 'PENDING');
  });
});

test('a worker cannot approve their own production entry', async () => {
  const workerId = new mongoose.Types.ObjectId();
  const entry = {
    worker: workerId,
    productionOrder: new mongoose.Types.ObjectId(),
    quantity: 1,
    status: 'PENDING',
    save: async () => assert.fail('A self-reviewed entry must not be saved'),
  };

  await withMocks({ entry, orderResult: {} }, async () => {
    await assert.rejects(
      () =>
        reviewProductionEntry({
          entryId: new mongoose.Types.ObjectId(),
          reviewerId: workerId,
          decision: 'APPROVED',
        }),
      (error) => error.statusCode === 403 && /own production entry/i.test(error.message)
    );
  });
});
