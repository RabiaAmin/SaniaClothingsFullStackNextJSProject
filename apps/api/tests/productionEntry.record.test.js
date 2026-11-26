const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionEntry = require('../src/models/productionEntry.model');
const ProductionOrder = require('../src/models/productionOrder.model');
const User = require('../src/models/user.model');
const notificationService = require('../src/services/notification.service');
const { recordProductionEntry } = require('../src/services/productionEntry.service');
const { buildPayrollReport, getDateRange } = require('../src/services/payroll.service');
const { ROLE_DEFINITIONS } = require('../src/services/rbac.service');
const productionEntryRoutes = require('../src/routes/productionEntry.routes');
const productionEntryController = require('../src/controllers/productionEntry.controller');

function roleUser(slug, id = new mongoose.Types.ObjectId()) {
  const definition = ROLE_DEFINITIONS.find((role) => role.slug === slug);
  return {
    _id: id,
    username: slug,
    isActive: true,
    mustChangePassword: false,
    role: {
      slug,
      isActive: true,
      permissions: definition.permissions.map((key) => ({ key })),
    },
  };
}

function buildOrder(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    poNumber: 'PO-2001',
    status: 'IN_PROGRESS',
    assignedWorkers: [],
    orderedQuantity: 100,
    approvedQuantity: 30,
    workerRate: 15,
    ...overrides,
  };
}

// Stubs every collaborator of recordProductionEntry and captures what it did.
async function withRecordMocks(
  { order, eligibleWorkers = [], addResult = { approvedQuantity: 1 }, transactions = true },
  callback
) {
  const originals = {
    startSession: mongoose.startSession,
    orderFindById: ProductionOrder.findById,
    addApprovedQuantity: ProductionOrder.addApprovedQuantity,
    removeApprovedQuantity: ProductionOrder.removeApprovedQuantity,
    entryCreate: ProductionEntry.create,
    userFind: User.find,
    notify: notificationService.createNotificationsForUsers,
    notifyManagers: notificationService.createNotificationsForAnyPermission,
  };
  const calls = { add: [], remove: [], create: [], notify: [], managers: [] };
  const session = { withTransaction: async (work) => work(), endSession: async () => {} };

  mongoose.startSession = async () => session;
  ProductionOrder.findById = async () => order;
  ProductionOrder.addApprovedQuantity = async (...args) => {
    if (!transactions && args[3]?.session) {
      const error = new Error(
        'Transaction numbers are only allowed on a replica set member or mongos'
      );
      error.code = 20;
      throw error;
    }
    calls.add.push(args);
    return addResult;
  };
  ProductionOrder.removeApprovedQuantity = async (...args) => {
    calls.remove.push(args);
    return {};
  };
  ProductionEntry.create = async (documents, options) => {
    calls.create.push({ documents, options });
    if (calls.failCreate) throw new Error('entry insert failed');
    if (Array.isArray(documents)) {
      return documents.map((document) => ({ _id: new mongoose.Types.ObjectId(), ...document }));
    }
    return { _id: new mongoose.Types.ObjectId(), ...documents };
  };
  User.find = () => ({
    select() {
      return this;
    },
    populate() {
      return this;
    },
    sort: async () => eligibleWorkers,
  });
  notificationService.createNotificationsForAnyPermission = async (payload) => {
    calls.managers.push(payload);
    return [];
  };
  notificationService.createNotificationsForUsers = async (payload) => {
    calls.notify.push(payload);
    if (calls.failNotify) throw new Error('notification insert failed');
    return [];
  };

  try {
    await callback(calls, session);
  } finally {
    mongoose.startSession = originals.startSession;
    ProductionOrder.findById = originals.orderFindById;
    ProductionOrder.addApprovedQuantity = originals.addApprovedQuantity;
    ProductionOrder.removeApprovedQuantity = originals.removeApprovedQuantity;
    ProductionEntry.create = originals.entryCreate;
    User.find = originals.userFind;
    notificationService.createNotificationsForUsers = originals.notify;
    notificationService.createNotificationsForAnyPermission = originals.notifyManagers;
  }
}

for (const recorderSlug of ['admin', 'production-manager']) {
  test(`${recorderSlug} records production for an assigned worker as an approved entry`, async () => {
    const worker = roleUser('worker');
    const recorder = roleUser(recorderSlug);
    const order = buildOrder({ assignedWorkers: [worker._id] });

    await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls, session) => {
      const entry = await recordProductionEntry({
        productionOrderId: order._id,
        workerId: worker._id,
        recorderId: recorder._id,
        recorderName: recorder.username,
        date: new Date('2026-11-20T00:00:00.000Z'),
        quantity: 40,
        notes: 'Counted at the cutting table',
      });

      // The entry belongs to the worker, records who counted it, and is approved immediately.
      assert.equal(entry.worker, worker._id);
      assert.equal(entry.recordedBy, recorder._id);
      assert.equal(entry.reviewedBy, recorder._id);
      assert.ok(entry.reviewedAt instanceof Date);
      assert.equal(entry.status, 'APPROVED');
      assert.equal(entry.unitRate, 15);
      assert.equal(entry.totalAmount, 600);

      // Order progress uses the existing bounded increment inside the same transaction.
      assert.equal(calls.add.length, 1);
      assert.equal(calls.add[0][0], order._id);
      assert.equal(calls.add[0][1], 40);
      assert.equal(calls.add[0][2], recorder._id);
      assert.equal(calls.add[0][3].session, session);
      assert.equal(calls.create[0].options.session, session);

      assert.equal(calls.notify.length, 1);
      assert.deepEqual(calls.notify[0].recipientIds, [worker._id]);
      assert.equal(calls.notify[0].type, 'PRODUCTION_ENTRY_APPROVED');
      assert.match(calls.notify[0].message, /recorded 40 approved pieces for you on PO-2001/);

      // Other managers are informed for the Production Manager PWA; the actor and worker are not.
      assert.equal(calls.managers.length, 1);
      assert.equal(calls.managers[0].type, 'PRODUCTION_ENTRY_RECORDED');
      assert.deepEqual(calls.managers[0].permissions, ['production_entry.approve']);
      assert.deepEqual(calls.managers[0].excludeUserIds, [recorder._id, worker._id]);
      assert.match(calls.managers[0].message, /recorded 40 pieces for worker on PO-2001/);
    });
  });
}

test('the payroll report counts a manager-recorded entry and keeps historical results intact', () => {
  const worker = { _id: 'worker-1', username: 'worker-one' };
  const productionOrder = { _id: 'order-1', poNumber: 'PO-2001', productionDescription: 'Shirts' };
  const base = { worker, productionOrder, date: new Date('2026-11-20T00:00:00.000Z') };
  const report = buildPayrollReport(
    [
      // New manager-recorded entry.
      { ...base, _id: 'new', quantity: 40, unitRate: 15, status: 'APPROVED', recordedBy: 'pm-1' },
      // Historical worker-submitted entries are untouched by the workflow change.
      { ...base, _id: 'legacy-approved', quantity: 10, unitRate: 12, status: 'APPROVED' },
      { ...base, _id: 'legacy-pending', quantity: 99, unitRate: 12, status: 'PENDING' },
      { ...base, _id: 'legacy-rejected', quantity: 77, unitRate: 12, status: 'REJECTED' },
    ],
    getDateRange('2026-10-26', '2026-11-26')
  );

  assert.equal(report.summary.totalApprovedPieces, 50);
  assert.equal(report.summary.totalEarnings, 720);
});

test('recording rejects a worker who is not assigned to the order', async () => {
  const worker = roleUser('worker');
  const order = buildOrder({ assignedWorkers: [new mongoose.Types.ObjectId()] });

  await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls) => {
    await assert.rejects(
      () =>
        recordProductionEntry({
          productionOrderId: order._id,
          workerId: worker._id,
          recorderId: new mongoose.Types.ObjectId(),
          recorderName: 'pm',
          date: new Date(),
          quantity: 5,
        }),
      (error) => error.statusCode === 400 && /not assigned/i.test(error.message)
    );
    assert.equal(calls.add.length, 0);
    assert.equal(calls.create.length, 0);
  });
});

test('recording rejects an assigned worker who is inactive or no longer eligible', async () => {
  const worker = roleUser('worker');
  const order = buildOrder({ assignedWorkers: [worker._id] });

  await withRecordMocks({ order, eligibleWorkers: [] }, async (calls) => {
    await assert.rejects(
      () =>
        recordProductionEntry({
          productionOrderId: order._id,
          workerId: worker._id,
          recorderId: new mongoose.Types.ObjectId(),
          recorderName: 'pm',
          date: new Date(),
          quantity: 5,
        }),
      (error) => error.statusCode === 400 && /no longer an active worker/i.test(error.message)
    );
    assert.equal(calls.create.length, 0);
  });
});

test('a manager cannot record and approve their own production', async () => {
  const admin = roleUser('admin');
  const order = buildOrder({ assignedWorkers: [admin._id] });

  await withRecordMocks({ order, eligibleWorkers: [admin] }, async (calls) => {
    await assert.rejects(
      () =>
        recordProductionEntry({
          productionOrderId: order._id,
          workerId: admin._id,
          recorderId: admin._id,
          recorderName: 'admin',
          date: new Date(),
          quantity: 5,
        }),
      (error) => error.statusCode === 403
    );
    assert.equal(calls.create.length, 0);
  });
});

test('recording rejects missing and closed production orders', async () => {
  const worker = roleUser('worker');
  const input = {
    productionOrderId: new mongoose.Types.ObjectId(),
    workerId: worker._id,
    recorderId: new mongoose.Types.ObjectId(),
    recorderName: 'pm',
    date: new Date(),
    quantity: 5,
  };

  await withRecordMocks({ order: null }, async () => {
    await assert.rejects(() => recordProductionEntry(input), { statusCode: 404 });
  });
  for (const status of ['COMPLETED', 'CANCELLED']) {
    const order = buildOrder({ status, assignedWorkers: [worker._id] });
    await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls) => {
      await assert.rejects(() => recordProductionEntry(input), { statusCode: 409 });
      assert.equal(calls.create.length, 0);
    });
  }
});

test('recording rejects quantities above the remaining approved order quantity', async () => {
  const worker = roleUser('worker');
  const order = buildOrder({
    assignedWorkers: [worker._id],
    orderedQuantity: 100,
    approvedQuantity: 90,
  });

  await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls) => {
    await assert.rejects(
      () =>
        recordProductionEntry({
          productionOrderId: order._id,
          workerId: worker._id,
          recorderId: new mongoose.Types.ObjectId(),
          recorderName: 'pm',
          date: new Date(),
          quantity: 11,
        }),
      (error) => error.statusCode === 409 && /remaining order quantity \(10\)/.test(error.message)
    );
    assert.equal(calls.add.length, 0);
    assert.equal(calls.create.length, 0);
  });
});

test('a concurrent change that exhausts the order aborts the entry atomically', async () => {
  const worker = roleUser('worker');
  const order = buildOrder({ assignedWorkers: [worker._id] });

  await withRecordMocks({ order, eligibleWorkers: [worker], addResult: null }, async (calls) => {
    await assert.rejects(
      () =>
        recordProductionEntry({
          productionOrderId: order._id,
          workerId: worker._id,
          recorderId: new mongoose.Types.ObjectId(),
          recorderName: 'pm',
          date: new Date(),
          quantity: 10,
        }),
      { statusCode: 409 }
    );
    assert.equal(calls.create.length, 0);
    assert.equal(calls.notify.length, 0);
  });
});

test('standalone MongoDB fallback records the entry and compensates a failed insert', async () => {
  const worker = roleUser('worker');
  const recorderId = new mongoose.Types.ObjectId();
  const order = buildOrder({ assignedWorkers: [worker._id] });
  const input = {
    productionOrderId: order._id,
    workerId: worker._id,
    recorderId,
    recorderName: 'pm',
    date: new Date(),
    quantity: 10,
  };

  await withRecordMocks(
    { order, eligibleWorkers: [worker], transactions: false },
    async (calls) => {
      const entry = await recordProductionEntry(input);
      assert.equal(entry.status, 'APPROVED');
      assert.equal(calls.add.length, 1);
      assert.equal(calls.add[0][3], undefined);
      assert.equal(calls.remove.length, 0);

      calls.failCreate = true;
      await assert.rejects(() => recordProductionEntry(input), /entry insert failed/);
      assert.deepEqual(calls.remove.at(-1), [order._id, 10, recorderId]);
    }
  );
});

test('a notification failure does not report recorded production as failed', async () => {
  const worker = roleUser('worker');
  const order = buildOrder({ assignedWorkers: [worker._id] });
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls) => {
      calls.failNotify = true;
      const entry = await recordProductionEntry({
        productionOrderId: order._id,
        workerId: worker._id,
        recorderId: new mongoose.Types.ObjectId(),
        recorderName: 'pm',
        date: new Date(),
        quantity: 10,
      });
      assert.equal(entry.status, 'APPROVED');
      assert.equal(calls.add.length, 1);
    });
  } finally {
    console.error = originalConsoleError;
  }
});

// ----- Route-level authorization: the API, not the UI, enforces read-only workers. -----

function routeGuards(method, path) {
  const layer = productionEntryRoutes.stack.find(
    (item) => item.route?.path === path && item.route.methods[method]
  );
  const handlers = layer.route.stack.map((item) => item.handle);
  // [protect, ...authorize guards, controller]
  return handlers.slice(1, -1);
}

async function passesGuards(guards, user) {
  for (const guard of guards) {
    const result = await new Promise((resolve) => {
      guard(
        { user },
        {
          status(status) {
            return { json: () => resolve(status) };
          },
        },
        () => resolve('next')
      );
    });
    if (result !== 'next') return result;
  }
  return 'allowed';
}

test('workers cannot create production entries through the API', async () => {
  assert.equal(await passesGuards(routeGuards('post', '/'), roleUser('worker')), 403);
});

test('Admin and Production Manager pass the production recording route guards', async () => {
  assert.equal(await passesGuards(routeGuards('post', '/'), roleUser('admin')), 'allowed');
  assert.equal(
    await passesGuards(routeGuards('post', '/'), roleUser('production-manager')),
    'allowed'
  );
});

test('workers cannot edit production entries and no delete route exists', async () => {
  assert.equal(await passesGuards(routeGuards('put', '/:id'), roleUser('worker')), 403);
  assert.equal(
    await passesGuards(routeGuards('put', '/:id'), roleUser('production-manager')),
    'allowed'
  );
  assert.equal(
    productionEntryRoutes.stack.some((item) => item.route?.methods.delete),
    false
  );
});

test('workers can still read their own entries and payroll through the read routes', async () => {
  assert.equal(await passesGuards(routeGuards('get', '/'), roleUser('worker')), 'allowed');
  assert.equal(await passesGuards(routeGuards('get', '/:id'), roleUser('worker')), 'allowed');
});

// ----- Worker read scoping -----

function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    const result = {};
    handler(
      req,
      {
        status(status) {
          result.status = status;
          return this;
        },
        json(body) {
          result.body = body;
          resolve(result);
        },
      },
      reject
    );
  });
}

test("a worker's entry list is forced to their own entries even when another worker is requested", async () => {
  const worker = roleUser('worker');
  const originals = {
    find: ProductionEntry.find,
    count: ProductionEntry.countDocuments,
    aggregate: ProductionEntry.aggregate,
  };
  let capturedFilter;
  ProductionEntry.find = (filter) => {
    capturedFilter = filter;
    return {
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit: async () => [],
    };
  };
  ProductionEntry.countDocuments = async () => 0;
  ProductionEntry.aggregate = async () => [];

  try {
    const response = await invoke(productionEntryController.getProductionEntries, {
      user: worker,
      query: { workerId: String(new mongoose.Types.ObjectId()) },
    });
    assert.equal(response.status, 200);
    assert.equal(capturedFilter.worker, worker._id);
  } finally {
    ProductionEntry.find = originals.find;
    ProductionEntry.countDocuments = originals.count;
    ProductionEntry.aggregate = originals.aggregate;
  }
});

test("a worker cannot open another worker's production entry", async () => {
  const worker = roleUser('worker');
  const originalFindById = ProductionEntry.findById;
  ProductionEntry.findById = () => ({
    populate: async () => ({ worker: { _id: new mongoose.Types.ObjectId() } }),
  });

  try {
    const response = await invoke(productionEntryController.getProductionEntry, {
      user: worker,
      params: { id: String(new mongoose.Types.ObjectId()) },
    });
    assert.equal(response.status, 403);
  } finally {
    ProductionEntry.findById = originalFindById;
  }
});

test('the controller rejects an invalid worker before recording', async () => {
  const response = await invoke(productionEntryController.createProductionEntry, {
    user: roleUser('production-manager'),
    body: {
      productionOrderId: String(new mongoose.Types.ObjectId()),
      workerId: 'not-an-id',
      date: '2026-11-20',
      quantity: 5,
    },
  });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /valid worker/i);
});

test('recording validates the production date before changing order progress', async () => {
  const worker = roleUser('worker');
  const order = buildOrder({
    assignedWorkers: [worker._id],
    startDate: new Date('2026-11-01T00:00:00.000Z'),
  });
  const now = new Date('2026-11-26T10:00:00.000Z');

  await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls) => {
    for (const date of ['2026-11-28', '2026-10-31']) {
      await assert.rejects(
        () =>
          recordProductionEntry({
            productionOrderId: order._id,
            workerId: worker._id,
            recorderId: new mongoose.Types.ObjectId(),
            recorderName: 'pm',
            date: new Date(date),
            quantity: 5,
            now,
          }),
        { statusCode: 400 }
      );
    }
    assert.equal(calls.add.length, 0);
    assert.equal(calls.create.length, 0);
  });
});

test('a corrected entry can be recorded once a reversal frees the order quantity', async () => {
  const worker = roleUser('worker');
  // A completed order (100/100) whose 40-piece entry was reversed is back to 60 and in progress.
  const order = buildOrder({
    assignedWorkers: [worker._id],
    orderedQuantity: 100,
    approvedQuantity: 60,
    status: 'IN_PROGRESS',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
  });

  await withRecordMocks({ order, eligibleWorkers: [worker] }, async (calls) => {
    const corrected = await recordProductionEntry({
      productionOrderId: order._id,
      workerId: worker._id,
      recorderId: new mongoose.Types.ObjectId(),
      recorderName: 'pm',
      date: new Date('2026-10-20'),
      quantity: 30,
      now: new Date('2026-11-26T10:00:00.000Z'),
    });
    assert.equal(corrected.status, 'APPROVED');
    assert.equal(corrected.quantity, 30);
    assert.equal(calls.add[0][1], 30);
  });
});
