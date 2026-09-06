const test = require('node:test');
const assert = require('node:assert/strict');
const Business = require('../src/models/business.model');
const ProductionEntry = require('../src/models/productionEntry.model');
const User = require('../src/models/user.model');
const payrollController = require('../src/controllers/payroll.controller');

function invoke(query, options = {}) {
  return new Promise((resolve, reject) => {
    const result = {};
    const req = {
      query,
      user: options.user ?? {
        _id: '507f1f77bcf86cd799439011',
        role: { permissions: [{ key: 'payroll.read_own' }] },
      },
    };
    const res = {
      status(status) {
        result.status = status;
        return this;
      },
      json(body) {
        result.body = body;
        resolve(result);
        return this;
      },
    };
    (options.handler ?? payrollController.getPayroll)(req, res, reject);
  });
}

test('payroll controller requires both custom range dates', async () => {
  const response = await invoke({ startDate: '2026-08-26' });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /start date and end date are required/i);
});

test('payroll PDF data uses the shared report calculation and business profile', async () => {
  const originalEntryFind = ProductionEntry.find;
  const originalBusinessFind = Business.findOne;
  const originalUserFindById = User.findById;
  const selectedWorkerId = '507f1f77bcf86cd799439012';
  let payrollFilter;
  ProductionEntry.find = (filter) => {
    payrollFilter = filter;
    return {
      select() {
        return this;
      },
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      lean: async () => [
        {
          _id: 'entry-1',
          status: 'APPROVED',
          date: new Date('2026-08-26T00:00:00.000Z'),
          worker: { _id: selectedWorkerId, username: 'shahzad' },
          productionOrder: { _id: 'order-1', poNumber: 'PO-1' },
          quantity: 40,
          unitRate: 15,
        },
      ],
    };
  };
  Business.findOne = () => ({
    select() {
      return this;
    },
    lean: async () => ({ name: 'Sania Clothing', address: 'Cape Town' }),
  });
  User.findById = (workerId) => ({
    select() {
      return this;
    },
    lean: async () => ({ _id: workerId, username: 'shahzad', email: 'shahzad@sania.test' }),
  });

  try {
    const response = await invoke(
      { startDate: '2026-08-26', endDate: '2026-09-27', workerId: selectedWorkerId },
      {
        handler: payrollController.getPayrollPdfData,
        user: {
          _id: '507f1f77bcf86cd799439011',
          role: { permissions: [{ key: '*' }] },
        },
      }
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.business.name, 'Sania Clothing');
    assert.equal(response.body.selectedWorker.username, 'shahzad');
    assert.equal(response.body.report.summary.totalApprovedPieces, 40);
    assert.equal(response.body.report.summary.totalEarnings, 600);
    assert.equal(response.body.report.summary.workerCount, 1);
    assert.equal(response.body.report.workers[0].worker.username, 'shahzad');
    assert.equal(payrollFilter.status, 'APPROVED');
    assert.equal(payrollFilter.worker, selectedWorkerId);
    assert.equal(payrollFilter.date.$gte.toISOString(), '2026-08-26T00:00:00.000Z');
    assert.equal(payrollFilter.date.$lt.toISOString(), '2026-09-28T00:00:00.000Z');
  } finally {
    ProductionEntry.find = originalEntryFind;
    Business.findOne = originalBusinessFind;
    User.findById = originalUserFindById;
  }
});

test('payroll PDF data rejects a valid but unknown worker identifier', async () => {
  const originalEntryFind = ProductionEntry.find;
  const originalBusinessFind = Business.findOne;
  const originalUserFindById = User.findById;
  ProductionEntry.find = () => ({
    select() {
      return this;
    },
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => [],
  });
  Business.findOne = () => ({
    select() {
      return this;
    },
    lean: async () => ({ name: 'Sania Clothing' }),
  });
  User.findById = () => ({
    select() {
      return this;
    },
    lean: async () => null,
  });

  try {
    const response = await invoke(
      {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        workerId: '507f1f77bcf86cd799439099',
      },
      {
        handler: payrollController.getPayrollPdfData,
        user: {
          _id: '507f1f77bcf86cd799439011',
          role: { permissions: [{ key: '*' }] },
        },
      }
    );

    assert.equal(response.status, 404);
    assert.match(response.body.message, /worker not found/i);
  } finally {
    ProductionEntry.find = originalEntryFind;
    Business.findOne = originalBusinessFind;
    User.findById = originalUserFindById;
  }
});

test('payroll controller rejects a start date after the end date', async () => {
  const response = await invoke({ startDate: '2026-09-28', endDate: '2026-09-27' });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /start date is not after end date/i);
});
