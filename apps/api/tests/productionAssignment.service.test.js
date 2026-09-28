const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const notificationService = require('../src/services/notification.service');
const {
  getNewlyAssignedWorkerIds,
  isEligibleWorker,
  isWorkerAssigned,
  notifyAssignedWorkers,
  resolveAssignedWorkerIds,
} = require('../src/services/productionAssignment.service');

function worker(id, overrides = {}) {
  return {
    _id: id,
    isActive: true,
    role: {
      isActive: true,
      permissions: [
        { key: 'production_order.read' },
        { key: 'production_entry.create' },
        { key: 'production_entry.read_own' },
      ],
    },
    ...overrides,
  };
}

test('worker eligibility uses active status and permissions instead of role names', () => {
  assert.equal(isEligibleWorker(worker(new mongoose.Types.ObjectId())), true);
  assert.equal(isEligibleWorker(worker(new mongoose.Types.ObjectId(), { isActive: false })), false);
  assert.equal(
    isEligibleWorker(
      worker(new mongoose.Types.ObjectId(), {
        role: {
          isActive: true,
          permissions: [{ key: 'production_entry.create' }, { key: 'production_entry.read_own' }],
        },
      })
    ),
    false
  );
  assert.equal(
    isEligibleWorker(
      worker(new mongoose.Types.ObjectId(), {
        role: { isActive: true, permissions: [{ key: 'production_entry.create' }] },
      })
    ),
    false
  );
});

test('assignment validation deduplicates eligible worker IDs', async () => {
  const originalFind = User.find;
  const workerId = new mongoose.Types.ObjectId();
  User.find = () => ({
    select() {
      return this;
    },
    populate() {
      return this;
    },
    sort: async () => [worker(workerId)],
  });

  try {
    assert.deepEqual(await resolveAssignedWorkerIds([workerId, String(workerId)]), [
      String(workerId),
    ]);
    await assert.rejects(
      () => resolveAssignedWorkerIds(['invalid-worker-id']),
      /identifiers are invalid/i
    );
  } finally {
    User.find = originalFind;
  }
});

test('assignment notifications use the existing deduplicating notification service', async () => {
  const originalCreateNotifications = notificationService.createNotificationsForUsers;
  const workerIds = [String(new mongoose.Types.ObjectId()), String(new mongoose.Types.ObjectId())];
  const orderId = new mongoose.Types.ObjectId();
  let payload;
  notificationService.createNotificationsForUsers = async (value) => {
    payload = value;
    return ['created'];
  };

  try {
    const result = await notifyAssignedWorkers({
      workerIds,
      order: { _id: orderId, poNumber: 'PO-100', itemCode: 'ITEM-100' },
      actorId: 'manager-id',
    });

    assert.deepEqual(result, ['created']);
    assert.deepEqual(payload.recipientIds, workerIds);
    assert.equal(payload.type, 'PRODUCTION_ORDER_ASSIGNED');
    assert.equal(payload.productionOrder, orderId);
  } finally {
    notificationService.createNotificationsForUsers = originalCreateNotifications;
  }
});

test('an empty assignment creates no worker notifications', async () => {
  const originalCreateNotifications = notificationService.createNotificationsForUsers;
  let callCount = 0;
  notificationService.createNotificationsForUsers = async () => {
    callCount += 1;
    return [];
  };

  try {
    assert.deepEqual(
      await notifyAssignedWorkers({
        workerIds: [],
        order: { _id: new mongoose.Types.ObjectId(), poNumber: 'PO-UNASSIGNED' },
        actorId: new mongoose.Types.ObjectId(),
      }),
      []
    );
    assert.equal(callCount, 0);
  } finally {
    notificationService.createNotificationsForUsers = originalCreateNotifications;
  }
});

test('assignment changes identify only newly assigned workers', () => {
  const workerA = new mongoose.Types.ObjectId();
  const workerB = new mongoose.Types.ObjectId();
  const workerC = new mongoose.Types.ObjectId();

  assert.deepEqual(getNewlyAssignedWorkerIds([workerA, workerB], [workerA, workerB]), []);
  assert.deepEqual(getNewlyAssignedWorkerIds([workerA, workerB], [workerA, workerB, workerC]), [
    String(workerC),
  ]);
});

test('worker access requires an explicit production order assignment', () => {
  const workerId = new mongoose.Types.ObjectId();

  assert.equal(isWorkerAssigned({ assignedWorkers: [] }, workerId), false);
  assert.equal(isWorkerAssigned({ assignedWorkers: [workerId] }, workerId), true);
  assert.equal(isWorkerAssigned({ assignedWorkers: [{ _id: workerId }] }, workerId), true);
});
