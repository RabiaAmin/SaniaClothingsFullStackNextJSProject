const test = require('node:test');
const assert = require('node:assert/strict');
const ProductionEntry = require('../src/models/productionEntry.model');
const {
  getDateRange,
  getMonthRange,
  buildPayrollReport,
  getPayrollReport,
} = require('../src/services/payroll.service');

const period = getDateRange('2026-08-26', '2026-09-27');
const worker = { _id: 'worker-1', username: 'worker-one', email: 'worker@sania.test' };

function entry(overrides = {}) {
  return {
    _id: 'entry-1',
    worker,
    productionOrder: {
      _id: 'order-1',
      poNumber: 'PO-1001',
      productionDescription: 'Navy work jackets',
      product: { _id: 'product-1', name: 'Work Jacket' },
    },
    date: new Date('2026-08-10T00:00:00.000Z'),
    quantity: 40,
    unitRate: 15,
    totalAmount: 999999,
    status: 'APPROVED',
    ...overrides,
  };
}

test('payroll totals approved entries using their historical rate snapshots', () => {
  const report = buildPayrollReport(
    [
      entry(),
      entry({
        _id: 'entry-2',
        productionOrder: {
          _id: 'order-2',
          poNumber: 'PO-1002',
          productionDescription: 'Utility shirts',
        },
        quantity: 100,
        unitRate: 12,
        totalAmount: 1,
      }),
    ],
    period
  );

  assert.equal(report.summary.workerCount, 1);
  assert.equal(report.summary.entryCount, 2);
  assert.equal(report.summary.totalApprovedPieces, 140);
  assert.equal(report.summary.totalEarnings, 1800);
  assert.equal(report.workers[0].totalApprovedPieces, 140);
  assert.equal(report.workers[0].totalEarnings, 1800);
  assert.deepEqual(
    report.workers[0].entries.map(({ poNumber, quantity, unitRate, amount }) => ({
      poNumber,
      quantity,
      unitRate,
      amount,
    })),
    [
      { poNumber: 'PO-1001', quantity: 40, unitRate: 15, amount: 600 },
      { poNumber: 'PO-1002', quantity: 100, unitRate: 12, amount: 1200 },
    ]
  );
});

test('pending and rejected entries never contribute to payroll', () => {
  const report = buildPayrollReport(
    [
      entry({ _id: 'pending', status: 'PENDING', quantity: 1000 }),
      entry({ _id: 'rejected', status: 'REJECTED', quantity: 1000 }),
    ],
    period
  );

  assert.deepEqual(report.summary, {
    workerCount: 0,
    entryCount: 0,
    totalApprovedPieces: 0,
    totalEarnings: 0,
  });
  assert.deepEqual(report.workers, []);
});

test('the same approved production entry cannot be counted twice', () => {
  const approvedEntry = entry();
  const report = buildPayrollReport([approvedEntry, { ...approvedEntry }], period);

  assert.equal(report.summary.entryCount, 1);
  assert.equal(report.summary.totalApprovedPieces, 40);
  assert.equal(report.summary.totalEarnings, 600);
});

test('month ranges use an inclusive UTC start and exclusive next-month boundary', () => {
  const december = getMonthRange(2026, 12);
  assert.equal(december.start.toISOString(), '2026-12-01T00:00:00.000Z');
  assert.equal(december.end.toISOString(), '2027-01-01T00:00:00.000Z');
  assert.equal(getMonthRange(2026, 0), null);
  assert.equal(getMonthRange(2026, 13), null);
  assert.equal(getMonthRange('invalid', 8), null);
});

test('custom ranges include both UTC boundary dates and exclude outside entries', async () => {
  const originalFind = ProductionEntry.find;
  const secondWorker = {
    _id: 'worker-2',
    username: 'worker-two',
    email: 'worker2@sania.test',
  };
  const entries = [
    entry({ _id: 'start', date: new Date('2026-08-26T00:00:00.000Z') }),
    entry({
      _id: 'end',
      worker: secondWorker,
      date: new Date('2026-09-27T23:59:59.999Z'),
      quantity: 20,
      unitRate: 10,
    }),
    entry({ _id: 'before', date: new Date('2026-08-25T23:59:59.999Z') }),
    entry({ _id: 'after', date: new Date('2026-09-28T00:00:00.000Z') }),
    entry({ _id: 'pending', date: new Date('2026-09-01T00:00:00.000Z'), status: 'PENDING' }),
  ];
  let capturedFilter;
  ProductionEntry.find = (filter) => {
    capturedFilter = filter;
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
      lean: async () =>
        entries.filter(
          (item) =>
            item.status === filter.status &&
            item.date >= filter.date.$gte &&
            item.date < filter.date.$lt
        ),
    };
  };

  try {
    const report = await getPayrollReport({
      startDate: '2026-08-26',
      endDate: '2026-09-27',
    });

    assert.equal(capturedFilter.date.$gte.toISOString(), '2026-08-26T00:00:00.000Z');
    assert.equal(capturedFilter.date.$lt.toISOString(), '2026-09-28T00:00:00.000Z');
    assert.equal(report.summary.workerCount, 2);
    assert.equal(report.summary.entryCount, 2);
    assert.equal(report.summary.totalApprovedPieces, 60);
    assert.equal(report.summary.totalEarnings, 800);
    assert.deepEqual(
      report.workers.flatMap((item) =>
        item.entries.map((auditEntry) => auditEntry.productionEntryId)
      ),
      ['start', 'end']
    );
  } finally {
    ProductionEntry.find = originalFind;
  }
});

test('custom date ranges reject invalid ordering and support a single day', () => {
  assert.equal(getDateRange('2026-09-28', '2026-09-27'), null);
  assert.equal(getDateRange('2026-02-30', '2026-03-01'), null);
  assert.equal(getDateRange('', '2026-09-27'), null);

  const sameDay = getDateRange('2026-09-27', '2026-09-27');
  assert.equal(sameDay.start.toISOString(), '2026-09-27T00:00:00.000Z');
  assert.equal(sameDay.end.toISOString(), '2026-09-27T00:00:00.000Z');
  assert.equal(sameDay.endExclusive.toISOString(), '2026-09-28T00:00:00.000Z');
});
