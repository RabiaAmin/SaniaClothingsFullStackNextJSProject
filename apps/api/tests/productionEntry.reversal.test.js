const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const ProductionEntry = require('../src/models/productionEntry.model');
const ProductionOrder = require('../src/models/productionOrder.model');
const notificationService = require('../src/services/notification.service');
const {
  reverseProductionEntry,
  validateProductionDate,
} = require('../src/services/productionEntry.service');
const { buildPayrollReport, getDateRange } = require('../src/services/payroll.service');
const { ROLE_DEFINITIONS } = require('../src/services/rbac.service');
const productionEntryRoutes = require('../src/routes/productionEntry.routes');
const productionOrderController = require('../src/controllers/productionOrder.controller');

const NOW = new Date('2026-11-26T10:00:00.000Z');

function roleUser(slug, id = new mongoose.Types.ObjectId()) {
  const definition = ROLE_DEFINITIONS.find((role) => role.slug === slug);
  return {
    _id: id,
    username: slug,
    isActive: true,
    mustChangePassword: false,
    role: { slug, isActive: true, permissions: definition.permissions.map((key) => ({ key })) },
  };
}

// ----- Production date validation (authoritative backend rule) -----

const order = { startDate: new Date('2026-11-01T00:00:00.000Z'), dueDate: new Date('2026-11-15') };

test('production dates in the future are rejected', () => {
  assert.throws(
    () => validateProductionDate(new Date('2026-11-28'), order, NOW),
    (error) => error.statusCode === 400 && /cannot be in the future/i.test(error.message)
  );
});

test('production dates before the order start date are rejected', () => {
  assert.throws(
    () => validateProductionDate(new Date('2026-10-31'), order, NOW),
    (error) =>
      error.statusCode === 400 && /before the order start date \(2026-11-01\)/.test(error.message)
  );
});

test('production dates after the due date are allowed so overdue orders can be completed', () => {
  assert.doesNotThrow(() => validateProductionDate(new Date('2026-11-20'), order, NOW));
});

test('valid production dates on the start date and today are accepted', () => {
  assert.doesNotThrow(() => validateProductionDate(new Date('2026-11-01'), order, NOW));
  assert.doesNotThrow(() => validateProductionDate(new Date('2026-11-26'), order, NOW));
});

test("a manager's local today is accepted ahead of UTC midnight", () => {
  // 23:30 UTC on the 25th is already the 26th in South Africa (UTC+2).
  const lateUtc = new Date('2026-11-25T23:30:00.000Z');
  assert.doesNotThrow(() => validateProductionDate(new Date('2026-11-26'), order, lateUtc));
  assert.throws(() => validateProductionDate(new Date('2026-11-27'), order, lateUtc), {
    statusCode: 400,
  });
});

test('invalid production dates are rejected', () => {
  assert.throws(() => validateProductionDate('not-a-date', order, NOW), { statusCode: 400 });
});

// ----- Reversal workflow -----

function buildOriginal(overrides = {}) {
  return new ProductionEntry({
    productionOrder: new mongoose.Types.ObjectId(),
    worker: new mongoose.Types.ObjectId(),
    date: new Date('2026-10-20T00:00:00.000Z'),
    quantity: 40,
    unitRate: 15,
    totalAmount: 600,
    status: 'APPROVED',
    recordedBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });
}

function queryOf(value) {
  const promise = Promise.resolve(value);
  promise.session = async () => value;
  return promise;
}

async function withReversalMocks(
  { original, removeResult = { poNumber: 'PO-3001' }, transactions = true },
  callback
) {
  const originals = {
    startSession: mongoose.startSession,
    findById: ProductionEntry.findById,
    findOneAndUpdate: ProductionEntry.findOneAndUpdate,
    updateOne: ProductionEntry.updateOne,
    create: ProductionEntry.create,
    remove: ProductionOrder.removeApprovedQuantity,
    add: ProductionOrder.addApprovedQuantity,
    notify: notificationService.createNotificationsForUsers,
    notifyManagers: notificationService.createNotificationsForAnyPermission,
  };
  const calls = { remove: [], add: [], created: [], notify: [], released: 0, managers: [] };
  const session = { withTransaction: async (work) => work(), endSession: async () => {} };
  const transactionError = () => {
    const error = new Error(
      'Transaction numbers are only allowed on a replica set member or mongos'
    );
    error.code = 20;
    return error;
  };

  mongoose.startSession = async () => session;
  ProductionEntry.findById = () => queryOf(original);
  // Simulates the atomic claim: only an approved, unreversed production entry can be claimed.
  ProductionEntry.findOneAndUpdate = async (filter, update, options) => {
    if (!transactions && options?.session) throw transactionError();
    const claimable =
      original &&
      original.status === 'APPROVED' &&
      original.entryType !== 'REVERSAL' &&
      !original.reversedAt;
    if (!claimable) return null;
    Object.assign(original, update.$set);
    return original;
  };
  ProductionEntry.updateOne = async (filter, update) => {
    if (update.$set.reversedAt === null) {
      calls.released += 1;
      Object.assign(original, update.$set);
    } else {
      Object.assign(original, update.$set);
    }
    return {};
  };
  ProductionEntry.create = async (documents) => {
    const list = Array.isArray(documents) ? documents : [documents];
    const created = list.map((document) => {
      const entry = new ProductionEntry(document);
      calls.created.push(entry);
      return entry;
    });
    for (const entry of created) await entry.validate();
    return Array.isArray(documents) ? created : created[0];
  };
  ProductionOrder.removeApprovedQuantity = async (...args) => {
    calls.remove.push(args);
    return removeResult;
  };
  ProductionOrder.addApprovedQuantity = async (...args) => {
    calls.add.push(args);
    return {};
  };
  notificationService.createNotificationsForAnyPermission = async (payload) => {
    calls.managers.push(payload);
    return [];
  };
  notificationService.createNotificationsForUsers = async (payload) => {
    calls.notify.push(payload);
    return [];
  };

  try {
    await callback(calls, session);
  } finally {
    mongoose.startSession = originals.startSession;
    ProductionEntry.findById = originals.findById;
    ProductionEntry.findOneAndUpdate = originals.findOneAndUpdate;
    ProductionEntry.updateOne = originals.updateOne;
    ProductionEntry.create = originals.create;
    ProductionOrder.removeApprovedQuantity = originals.remove;
    ProductionOrder.addApprovedQuantity = originals.add;
    notificationService.createNotificationsForUsers = originals.notify;
    notificationService.createNotificationsForAnyPermission = originals.notifyManagers;
  }
}

test('a manager reverses an approved entry with a reason and the original is kept for audit', async () => {
  const original = buildOriginal();
  const reverserId = new mongoose.Types.ObjectId();

  await withReversalMocks({ original }, async (calls, session) => {
    const { original: audited, reversalEntry } = await reverseProductionEntry({
      entryId: original._id,
      reverserId,
      reverserName: 'production-manager',
      reason: '  Miscounted bundle  ',
      now: NOW,
    });

    // Original: unchanged quantity/status/amount, plus permanent reversal audit fields.
    assert.equal(audited.status, 'APPROVED');
    assert.equal(audited.quantity, 40);
    assert.equal(audited.totalAmount, 600);
    assert.equal(audited.reversedBy, reverserId);
    assert.equal(audited.reversedAt, NOW);
    assert.equal(audited.reversalReason, 'Miscounted bundle');
    assert.equal(String(audited.reversalEntry), String(reversalEntry._id));

    // Offset: approved, negative, same worker/order/rate, dated on the reversal day.
    assert.equal(reversalEntry.entryType, 'REVERSAL');
    assert.equal(reversalEntry.status, 'APPROVED');
    assert.equal(String(reversalEntry.reversalOf), String(original._id));
    assert.equal(String(reversalEntry.worker), String(original.worker));
    assert.equal(String(reversalEntry.productionOrder), String(original.productionOrder));
    assert.equal(reversalEntry.quantity, -40);
    assert.equal(reversalEntry.unitRate, 15);
    assert.equal(reversalEntry.totalAmount, -600);
    assert.equal(reversalEntry.date.toISOString(), '2026-11-26T00:00:00.000Z');
    assert.equal(String(reversalEntry.recordedBy), String(reverserId));
    assert.match(reversalEntry.notes, /Miscounted bundle/);

    // Order progress is decremented atomically in the same transaction.
    assert.equal(calls.remove.length, 1);
    assert.equal(calls.remove[0][0], original.productionOrder);
    assert.equal(calls.remove[0][1], 40);
    assert.equal(calls.remove[0][2], reverserId);
    assert.equal(calls.remove[0][3].session, session);

    assert.equal(calls.notify[0].type, 'PRODUCTION_ENTRY_REVERSED');
    assert.equal(calls.managers[0].type, 'PRODUCTION_ENTRY_REVERSED');
    assert.deepEqual(calls.managers[0].excludeUserIds, [reverserId, original.worker]);
    assert.match(calls.managers[0].message, /Reason: Miscounted bundle/);
    assert.deepEqual(calls.notify[0].recipientIds, [original.worker]);
  });
});

test('a reversal requires a non-empty reason', async () => {
  const original = buildOriginal();
  await withReversalMocks({ original }, async (calls) => {
    for (const reason of [undefined, '', '   ']) {
      await assert.rejects(
        () =>
          reverseProductionEntry({
            entryId: original._id,
            reverserId: new mongoose.Types.ObjectId(),
            reverserName: 'pm',
            reason,
            now: NOW,
          }),
        (error) => error.statusCode === 400 && /reason is required/i.test(error.message)
      );
    }
    assert.equal(calls.remove.length, 0);
    assert.equal(original.reversedAt, null);
  });
});

test('an entry cannot be reversed twice', async () => {
  const original = buildOriginal();
  await withReversalMocks({ original }, async (calls) => {
    const input = {
      entryId: original._id,
      reverserId: new mongoose.Types.ObjectId(),
      reverserName: 'pm',
      reason: 'Wrong worker',
      now: NOW,
    };
    await reverseProductionEntry(input);
    await assert.rejects(
      () => reverseProductionEntry(input),
      (error) => error.statusCode === 409 && /already been reversed/i.test(error.message)
    );
    assert.equal(calls.remove.length, 1);
    assert.equal(calls.created.length, 1);
  });
});

test('the database enforces at most one reversal entry per original', () => {
  const index = ProductionEntry.schema
    .indexes()
    .find(([fields]) => Object.keys(fields).join() === 'reversalOf');
  assert.ok(index);
  assert.equal(index[1].unique, true);
  assert.deepEqual(index[1].partialFilterExpression, { reversalOf: { $type: 'objectId' } });
});

test('reversal entries and non-approved entries cannot be reversed', async () => {
  for (const [overrides, pattern] of [
    [
      { entryType: 'REVERSAL', quantity: -40, reversalOf: new mongoose.Types.ObjectId() },
      /reversal entry cannot/i,
    ],
    [{ status: 'PENDING' }, /only approved/i],
    [{ status: 'REJECTED' }, /only approved/i],
  ]) {
    const original = buildOriginal(overrides);
    await withReversalMocks({ original }, async (calls) => {
      await assert.rejects(
        () =>
          reverseProductionEntry({
            entryId: original._id,
            reverserId: new mongoose.Types.ObjectId(),
            reverserName: 'pm',
            reason: 'Correction',
            now: NOW,
          }),
        (error) => error.statusCode === 409 && pattern.test(error.message)
      );
      assert.equal(calls.remove.length, 0);
    });
  }
});

test('a manager cannot reverse their own production entry', async () => {
  const managerId = new mongoose.Types.ObjectId();
  const original = buildOriginal({ worker: managerId });
  await withReversalMocks({ original }, async () => {
    await assert.rejects(
      () =>
        reverseProductionEntry({
          entryId: original._id,
          reverserId: managerId,
          reverserName: 'admin',
          reason: 'Correction',
          now: NOW,
        }),
      { statusCode: 403 }
    );
  });
});

test('a reversal fails safely when the order no longer holds the approved quantity', async () => {
  const original = buildOriginal();
  await withReversalMocks({ original, removeResult: null }, async (calls) => {
    await assert.rejects(
      () =>
        reverseProductionEntry({
          entryId: original._id,
          reverserId: new mongoose.Types.ObjectId(),
          reverserName: 'pm',
          reason: 'Correction',
          now: NOW,
        }),
      { statusCode: 409 }
    );
    assert.equal(calls.created.length, 0);
  });
});

test('standalone MongoDB fallback reverses with compensation and releases a failed claim', async () => {
  const original = buildOriginal();
  await withReversalMocks({ original, transactions: false }, async (calls) => {
    const { reversalEntry } = await reverseProductionEntry({
      entryId: original._id,
      reverserId: new mongoose.Types.ObjectId(),
      reverserName: 'pm',
      reason: 'Correction',
      now: NOW,
    });
    assert.equal(reversalEntry.quantity, -40);
    assert.equal(calls.remove[0][3], undefined);
  });

  const second = buildOriginal();
  await withReversalMocks(
    { original: second, transactions: false, removeResult: null },
    async (calls) => {
      await assert.rejects(
        () =>
          reverseProductionEntry({
            entryId: second._id,
            reverserId: new mongoose.Types.ObjectId(),
            reverserName: 'pm',
            reason: 'Correction',
            now: NOW,
          }),
        { statusCode: 409 }
      );
      // The claim is released so the entry can be reversed once the order is consistent.
      assert.equal(calls.released, 1);
      assert.equal(second.reversedAt, null);
    }
  );
});

test('reversal entries validate as negative offsets and production entries stay positive', async () => {
  const reversal = new ProductionEntry({
    productionOrder: new mongoose.Types.ObjectId(),
    worker: new mongoose.Types.ObjectId(),
    date: NOW,
    quantity: -3,
    unitRate: 12.335,
    totalAmount: 0,
    status: 'APPROVED',
    entryType: 'REVERSAL',
    reversalOf: new mongoose.Types.ObjectId(),
  });
  await reversal.validate();
  const production = new ProductionEntry({
    productionOrder: new mongoose.Types.ObjectId(),
    worker: new mongoose.Types.ObjectId(),
    date: NOW,
    quantity: 3,
    unitRate: 12.335,
    totalAmount: 0,
  });
  await production.validate();
  // Sign-symmetric rounding: the offset exactly cancels the original amount.
  assert.equal(reversal.totalAmount, -production.totalAmount);

  await assert.rejects(
    () =>
      new ProductionEntry({ ...production.toObject(), _id: undefined, quantity: -3 }).validate(),
    /at least 1/i
  );
  await assert.rejects(
    () => new ProductionEntry({ ...reversal.toObject(), _id: undefined, quantity: 3 }).validate(),
    /must be negative/i
  );
});

test('order progress decrement keeps cancelled orders cancelled and reopens completed ones', async () => {
  const originalFindOneAndUpdate = ProductionOrder.findOneAndUpdate;
  let captured;
  ProductionOrder.findOneAndUpdate = (filter, update, options) => {
    captured = { filter, update, options };
    return Promise.resolve({});
  };
  try {
    const session = { id: 'session' };
    await ProductionOrder.removeApprovedQuantity(new mongoose.Types.ObjectId(), 40, null, {
      session,
    });
    assert.deepEqual(captured.filter.approvedQuantity, { $gte: 40 });
    const statusExpression = captured.update[0].$set.status.$cond;
    assert.deepEqual(statusExpression[0], { $eq: ['$status', 'CANCELLED'] });
    assert.equal(statusExpression[1], 'CANCELLED');
    assert.deepEqual(statusExpression[2].$cond.slice(1), ['PENDING', 'IN_PROGRESS']);
    assert.equal(captured.options.session, session);
  } finally {
    ProductionOrder.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('payroll keeps the original period intact and deducts the reversal in its own period', () => {
  const worker = { _id: 'worker-1', username: 'worker-one' };
  const productionOrder = { _id: 'order-1', poNumber: 'PO-3001', productionDescription: 'Shirts' };
  const entries = [
    // Original recorded in October, reversed in November, then corrected in November.
    {
      _id: 'original',
      worker,
      productionOrder,
      date: new Date('2026-10-20'),
      quantity: 40,
      unitRate: 15,
      status: 'APPROVED',
      reversedAt: NOW,
    },
    {
      _id: 'reversal',
      worker,
      productionOrder,
      date: new Date('2026-11-26'),
      quantity: -40,
      unitRate: 15,
      status: 'APPROVED',
      entryType: 'REVERSAL',
      reversalOf: 'original',
    },
    {
      _id: 'corrected',
      worker,
      productionOrder,
      date: new Date('2026-10-20'),
      quantity: 30,
      unitRate: 15,
      status: 'APPROVED',
    },
  ];
  const inPeriod = (from, to) =>
    entries.filter((entry) => entry.date >= new Date(from) && entry.date <= new Date(to));

  // A period that was already paid before the reversal keeps its original result.
  const october = buildPayrollReport(
    inPeriod('2026-09-26', '2026-10-25').filter((entry) => entry._id !== 'corrected'),
    getDateRange('2026-09-26', '2026-10-25')
  );
  assert.equal(october.summary.totalEarnings, 600);

  // The reversal period carries the deduction, labelled as a reversal row.
  const november = buildPayrollReport(
    inPeriod('2026-10-26', '2026-11-26'),
    getDateRange('2026-10-26', '2026-11-26')
  );
  assert.equal(november.summary.totalApprovedPieces, -40);
  assert.equal(november.summary.totalEarnings, -600);
  assert.equal(november.workers[0].entries[0].entryType, 'REVERSAL');
  assert.equal(november.workers[0].entries[0].reversalOf, 'original');

  // Across both periods the worker is paid only for the corrected quantity.
  const overall = buildPayrollReport(entries, getDateRange('2026-09-26', '2026-11-26'));
  assert.equal(overall.summary.totalApprovedPieces, 30);
  assert.equal(overall.summary.totalEarnings, 450);
});

// ----- Route authorization -----

function routeGuards(method, path) {
  const layer = productionEntryRoutes.stack.find(
    (item) => item.route?.path === path && item.route.methods[method]
  );
  return layer.route.stack.map((item) => item.handle).slice(1, -1);
}

async function passesGuards(guards, user) {
  for (const guard of guards) {
    const result = await new Promise((resolve) => {
      guard({ user }, { status: (status) => ({ json: () => resolve(status) }) }, () =>
        resolve('next')
      );
    });
    if (result !== 'next') return result;
  }
  return 'allowed';
}

test('workers cannot reverse production entries through the API', async () => {
  assert.equal(await passesGuards(routeGuards('patch', '/:id/reverse'), roleUser('worker')), 403);
});

test('Admin and Production Manager pass the reversal route guards', async () => {
  for (const slug of ['admin', 'production-manager']) {
    assert.equal(
      await passesGuards(routeGuards('patch', '/:id/reverse'), roleUser(slug)),
      'allowed'
    );
  }
});

// ----- Order selector reaches every open order through server-side search and pages -----

test('the recordable order filter pages beyond the first 100 open, assigned orders', async () => {
  const ProductionEntryModel = ProductionEntry;
  const originals = {
    aggregate: ProductionOrder.aggregate,
    count: ProductionOrder.countDocuments,
    find: ProductionOrder.find,
    entryAggregate: ProductionEntryModel.aggregate,
  };
  let pipeline;
  let countFilter;
  ProductionOrder.aggregate = async (stages) => {
    pipeline = stages;
    return [{ _id: new mongoose.Types.ObjectId() }];
  };
  ProductionOrder.countDocuments = async (filter) => {
    countFilter = filter;
    return 250;
  };
  ProductionOrder.find = () => ({ populate: async () => [] });
  ProductionEntryModel.aggregate = async () => [];

  try {
    const response = await new Promise((resolve, reject) => {
      const result = {};
      productionOrderController.getProductionOrders(
        {
          user: roleUser('production-manager'),
          query: { recordable: 'true', search: 'PO-2', page: '3', limit: '50' },
        },
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

    assert.equal(response.status, 200);
    assert.equal(response.body.totalRecords, 250);
    assert.equal(response.body.totalPages, 5);
    assert.ok(countFilter.$or, 'search is applied server-side');
    assert.deepEqual(countFilter.$and, [
      { status: { $nin: ['COMPLETED', 'CANCELLED'] } },
      { 'assignedWorkers.0': { $exists: true } },
    ]);
    assert.deepEqual(pipeline[0], { $match: countFilter });
    assert.ok(pipeline.some((stage) => stage.$skip === 100));
    assert.ok(pipeline.some((stage) => stage.$limit === 50));
  } finally {
    ProductionOrder.aggregate = originals.aggregate;
    ProductionOrder.countDocuments = originals.count;
    ProductionOrder.find = originals.find;
    ProductionEntryModel.aggregate = originals.entryAggregate;
  }
});
