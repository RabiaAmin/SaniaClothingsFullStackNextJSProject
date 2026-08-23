const test = require('node:test');
const assert = require('node:assert/strict');
const { getMonthRange, buildMonthlyPayrollReport } = require('../src/services/payroll.service');

const period = getMonthRange(2026, 8);
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

test('monthly payroll totals approved entries using their historical rate snapshots', () => {
  const report = buildMonthlyPayrollReport(
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
  const report = buildMonthlyPayrollReport(
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
  const report = buildMonthlyPayrollReport([approvedEntry, { ...approvedEntry }], period);

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
