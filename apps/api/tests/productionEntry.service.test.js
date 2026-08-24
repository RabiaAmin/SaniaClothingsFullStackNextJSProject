const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionEntry = require('../src/models/productionEntry.model');
const ProductionOrder = require('../src/models/productionOrder.model');
const notificationService = require('../src/services/notification.service');
const {
  submitProductionEntry,
  reviewProductionEntry,
} = require('../src/services/productionEntry.service');

function queryResult(value) {
  return {
    select() {
      return this;
    },
    session: async () => value,
  };
}

async function withMocks({ entry, orderResult }, callback) {
  const originals = {
    startSession: mongoose.startSession,
    findOne: ProductionEntry.findOne,
    findById: ProductionEntry.findById,
    orderFindById: ProductionOrder.findById,
    addApprovedQuantity: ProductionOrder.addApprovedQuantity,
    createNotificationsForUsers: notificationService.createNotificationsForUsers,
  };
  let approvalCall;
  let notificationCall;
  const session = {
    withTransaction: async (work) => work(),
    endSession: async () => {},
  };

  mongoose.startSession = async () => session;
  ProductionEntry.findOne = () => queryResult(entry);
  ProductionEntry.findById = () => queryResult(entry);
  ProductionOrder.findById = () => queryResult({ _id: entry.productionOrder, poNumber: 'PO-1001' });
  ProductionOrder.addApprovedQuantity = async (...args) => {
    approvalCall = args;
    return orderResult;
  };
  notificationService.createNotificationsForUsers = async (payload) => {
    notificationCall = payload;
    return [];
  };

  try {
    await callback(
      () => approvalCall,
      () => notificationCall,
      session
    );
  } finally {
    mongoose.startSession = originals.startSession;
    ProductionEntry.findOne = originals.findOne;
    ProductionEntry.findById = originals.findById;
    ProductionOrder.findById = originals.orderFindById;
    ProductionOrder.addApprovedQuantity = originals.addApprovedQuantity;
    notificationService.createNotificationsForUsers = originals.createNotificationsForUsers;
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
    async (approvalCall, notificationCall, session) => {
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
      assert.equal(notificationCall().recipientIds[0], workerId);
      assert.equal(notificationCall().type, 'PRODUCTION_ENTRY_APPROVED');
      assert.equal(notificationCall().productionOrder, orderId);
    }
  );
});

test('rejection notifies the worker without adding approved production', async () => {
  const workerId = new mongoose.Types.ObjectId();
  const entry = {
    _id: new mongoose.Types.ObjectId(),
    worker: workerId,
    productionOrder: new mongoose.Types.ObjectId(),
    quantity: 12,
    status: 'PENDING',
    save: async () => {},
  };

  await withMocks({ entry, orderResult: {} }, async (approvalCall, notificationCall) => {
    const result = await reviewProductionEntry({
      entryId: entry._id,
      reviewerId: new mongoose.Types.ObjectId(),
      decision: 'REJECTED',
    });

    assert.equal(result.status, 'REJECTED');
    assert.equal(approvalCall(), undefined);
    assert.equal(notificationCall().recipientIds[0], workerId);
    assert.equal(notificationCall().type, 'PRODUCTION_ENTRY_REJECTED');
  });
});

test('submission works without transactions and creates reviewer notifications', async () => {
  const originals = {
    orderFindById: ProductionOrder.findById,
    entryCreate: ProductionEntry.create,
    notify: notificationService.createNotificationsForAnyPermission,
  };
  const workerId = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  const entryId = new mongoose.Types.ObjectId();
  let notificationCall;
  let createDocument;

  ProductionOrder.findById = async () => ({
    _id: orderId,
    poNumber: 'PO-1025',
    status: 'IN_PROGRESS',
    orderedQuantity: 120,
    workerRate: 15,
  });
  ProductionEntry.create = async (document) => {
    createDocument = document;
    return { _id: entryId, ...document };
  };
  notificationService.createNotificationsForAnyPermission = async (payload) => {
    notificationCall = payload;
    return [];
  };

  try {
    const result = await submitProductionEntry({
      productionOrderId: orderId,
      workerId,
      workerName: 'John',
      date: new Date('2026-08-24T00:00:00.000Z'),
      quantity: 40,
    });

    assert.equal(result.unitRate, 15);
    assert.equal(result.totalAmount, 600);
    assert.equal(createDocument.productionOrder, orderId);
    assert.deepEqual(notificationCall.permissions, [
      'production_entry.approve',
      'production_entry.reject',
    ]);
    assert.deepEqual(notificationCall.excludeUserIds, [workerId]);
    assert.equal(notificationCall.message, 'John submitted 40 pieces for PO-1025.');
    assert.equal(notificationCall.productionEntry, entryId);
    assert.equal(notificationCall.productionOrder, orderId);
    assert.equal(notificationCall.session, undefined);
  } finally {
    ProductionOrder.findById = originals.orderFindById;
    ProductionEntry.create = originals.entryCreate;
    notificationService.createNotificationsForAnyPermission = originals.notify;
  }
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

test('standalone MongoDB fallback approves a claimed entry with atomic quantity protection', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findById: ProductionEntry.findById,
    findOneAndUpdate: ProductionEntry.findOneAndUpdate,
    updateOne: ProductionEntry.updateOne,
    addApprovedQuantity: ProductionOrder.addApprovedQuantity,
    removeApprovedQuantity: ProductionOrder.removeApprovedQuantity,
    orderFindById: ProductionOrder.findById,
    notify: notificationService.createNotificationsForUsers,
  };
  const entryId = new mongoose.Types.ObjectId();
  const workerId = new mongoose.Types.ObjectId();
  const reviewerId = new mongoose.Types.ObjectId();
  const orderId = new mongoose.Types.ObjectId();
  const existing = {
    _id: entryId,
    worker: workerId,
    productionOrder: orderId,
    quantity: 40,
    status: 'PENDING',
  };
  const finalized = { ...existing, status: 'APPROVED', reviewedBy: reviewerId };
  let entryUpdateCount = 0;
  let approvalCall;
  let notificationCall;

  mongoose.startSession = async () => ({
    withTransaction: async () => {
      const error = new Error(
        'Transaction numbers are only allowed on a replica set member or mongos'
      );
      error.code = 20;
      throw error;
    },
    endSession: async () => {},
  });
  ProductionEntry.findById = async () => existing;
  ProductionEntry.findOneAndUpdate = async () => {
    entryUpdateCount += 1;
    return entryUpdateCount === 1 ? existing : finalized;
  };
  ProductionEntry.updateOne = async () => ({ modifiedCount: 1 });
  ProductionOrder.addApprovedQuantity = async (...args) => {
    approvalCall = args;
    return { approvedQuantity: 40 };
  };
  ProductionOrder.removeApprovedQuantity = async () =>
    assert.fail('Successful approval must not roll back');
  ProductionOrder.findById = () => ({ select: async () => ({ poNumber: 'PO-STANDALONE' }) });
  notificationService.createNotificationsForUsers = async (payload) => {
    notificationCall = payload;
    return [];
  };

  try {
    const result = await reviewProductionEntry({
      entryId,
      reviewerId,
      decision: 'APPROVED',
    });

    assert.equal(result.status, 'APPROVED');
    assert.equal(entryUpdateCount, 2);
    assert.equal(approvalCall[0], orderId);
    assert.equal(approvalCall[1], 40);
    assert.equal(approvalCall[3], undefined);
    assert.equal(notificationCall.type, 'PRODUCTION_ENTRY_APPROVED');
  } finally {
    mongoose.startSession = originals.startSession;
    ProductionEntry.findById = originals.findById;
    ProductionEntry.findOneAndUpdate = originals.findOneAndUpdate;
    ProductionEntry.updateOne = originals.updateOne;
    ProductionOrder.addApprovedQuantity = originals.addApprovedQuantity;
    ProductionOrder.removeApprovedQuantity = originals.removeApprovedQuantity;
    ProductionOrder.findById = originals.orderFindById;
    notificationService.createNotificationsForUsers = originals.notify;
  }
});

test('standalone MongoDB fallback releases the claim when approval would overproduce', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findById: ProductionEntry.findById,
    findOneAndUpdate: ProductionEntry.findOneAndUpdate,
    updateOne: ProductionEntry.updateOne,
    addApprovedQuantity: ProductionOrder.addApprovedQuantity,
    removeApprovedQuantity: ProductionOrder.removeApprovedQuantity,
  };
  const entryId = new mongoose.Types.ObjectId();
  const workerId = new mongoose.Types.ObjectId();
  const reviewerId = new mongoose.Types.ObjectId();
  const claimed = {
    _id: entryId,
    worker: workerId,
    productionOrder: new mongoose.Types.ObjectId(),
    quantity: 81,
    status: 'PENDING',
  };
  let claimReleases = 0;

  mongoose.startSession = async () => ({
    withTransaction: async () => {
      const error = new Error(
        'Transaction numbers are only allowed on a replica set member or mongos'
      );
      error.code = 20;
      throw error;
    },
    endSession: async () => {},
  });
  ProductionEntry.findById = async () => claimed;
  ProductionEntry.findOneAndUpdate = async () => claimed;
  ProductionEntry.updateOne = async () => {
    claimReleases += 1;
    return { modifiedCount: 1 };
  };
  ProductionOrder.addApprovedQuantity = async () => null;
  ProductionOrder.removeApprovedQuantity = async () =>
    assert.fail('A rejected increment must not be decremented');

  try {
    await assert.rejects(
      () => reviewProductionEntry({ entryId, reviewerId, decision: 'APPROVED' }),
      (error) => error.statusCode === 409 && /remaining quantity/i.test(error.message)
    );
    assert.ok(claimReleases >= 1);
  } finally {
    mongoose.startSession = originals.startSession;
    ProductionEntry.findById = originals.findById;
    ProductionEntry.findOneAndUpdate = originals.findOneAndUpdate;
    ProductionEntry.updateOne = originals.updateOne;
    ProductionOrder.addApprovedQuantity = originals.addApprovedQuantity;
    ProductionOrder.removeApprovedQuantity = originals.removeApprovedQuantity;
  }
});
