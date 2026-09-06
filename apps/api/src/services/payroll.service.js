const ProductionEntry = require('../models/productionEntry.model');

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseUtcDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function getDateRange(startDate, endDate) {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  if (!start || !end || start > end) return null;

  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { start, end, endExclusive };
}

function getMonthRange(year, month) {
  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  if (
    !Number.isInteger(parsedYear) ||
    parsedYear < 2000 ||
    parsedYear > 2200 ||
    !Number.isInteger(parsedMonth) ||
    parsedMonth < 1 ||
    parsedMonth > 12
  ) {
    return null;
  }

  return {
    year: parsedYear,
    month: parsedMonth,
    start: new Date(Date.UTC(parsedYear, parsedMonth - 1, 1)),
    end: new Date(Date.UTC(parsedYear, parsedMonth, 1)),
  };
}

function workerIdentity(worker) {
  if (!worker) return { _id: null, username: 'Unknown worker', email: '' };
  if (typeof worker === 'string') return { _id: worker, username: 'Unknown worker', email: '' };
  return {
    _id: String(worker._id ?? worker.id),
    username: worker.username ?? 'Unknown worker',
    email: worker.email ?? '',
  };
}

function buildMonthlyPayrollReport(entries, period) {
  return buildPayrollReport(entries, period);
}

function buildPayrollReport(entries, period) {
  const uniqueEntries = new Map();
  for (const entry of entries) {
    if (entry.status !== 'APPROVED') continue;
    const entryId = String(entry._id ?? entry.id);
    if (!entryId || uniqueEntries.has(entryId)) continue;
    uniqueEntries.set(entryId, entry);
  }

  const workers = new Map();
  let totalApprovedPieces = 0;
  let totalEarnings = 0;

  for (const entry of uniqueEntries.values()) {
    const worker = workerIdentity(entry.worker);
    const workerId = worker._id ?? 'unknown';
    const order = entry.productionOrder ?? {};
    const quantity = Number(entry.quantity) || 0;
    const unitRate = Number(entry.unitRate) || 0;
    const amount = roundMoney(quantity * unitRate);
    const auditEntry = {
      productionEntryId: String(entry._id ?? entry.id),
      date: entry.date,
      productionOrderId: order._id ? String(order._id) : null,
      poNumber: order.poNumber ?? 'Unknown PO',
      product: order.product
        ? {
            _id: order.product._id ? String(order.product._id) : null,
            name: order.product.name ?? '',
          }
        : null,
      productionDescription: order.productionDescription ?? '',
      quantity,
      unitRate,
      amount,
    };

    if (!workers.has(workerId)) {
      workers.set(workerId, {
        worker,
        totalApprovedPieces: 0,
        totalEarnings: 0,
        entryCount: 0,
        entries: [],
      });
    }
    const workerReport = workers.get(workerId);
    workerReport.totalApprovedPieces += quantity;
    workerReport.totalEarnings = roundMoney(workerReport.totalEarnings + amount);
    workerReport.entryCount += 1;
    workerReport.entries.push(auditEntry);
    totalApprovedPieces += quantity;
    totalEarnings = roundMoney(totalEarnings + amount);
  }

  const workerReports = [...workers.values()].sort((left, right) =>
    left.worker.username.localeCompare(right.worker.username)
  );

  return {
    period: {
      ...(period.year !== undefined && { year: period.year }),
      ...(period.month !== undefined && { month: period.month }),
      start: period.start,
      end: period.end,
    },
    summary: {
      workerCount: workerReports.length,
      entryCount: uniqueEntries.size,
      totalApprovedPieces,
      totalEarnings,
    },
    workers: workerReports,
  };
}

async function findPayrollEntries(period, workerId) {
  const rangeEnd = period.endExclusive ?? period.end;
  const filter = {
    status: 'APPROVED',
    date: { $gte: period.start, $lt: rangeEnd },
  };
  if (workerId) filter.worker = workerId;

  return ProductionEntry.find(filter)
    .select('productionOrder worker date quantity unitRate status')
    .populate({
      path: 'productionOrder',
      select: 'poNumber productionDescription product',
      populate: { path: 'product', select: 'name' },
    })
    .populate({ path: 'worker', select: 'username email' })
    .sort({ worker: 1, date: 1, createdAt: 1 })
    .lean();
}

async function getPayrollReport({ startDate, endDate, workerId }) {
  const period = getDateRange(startDate, endDate);
  if (!period) return null;
  const entries = await findPayrollEntries(period, workerId);
  return buildPayrollReport(entries, period);
}

async function getMonthlyPayrollReport({ year, month, workerId }) {
  const period = getMonthRange(year, month);
  if (!period) return null;
  const entries = await findPayrollEntries(period, workerId);
  return buildMonthlyPayrollReport(entries, period);
}

module.exports = {
  roundMoney,
  getDateRange,
  getMonthRange,
  buildPayrollReport,
  buildMonthlyPayrollReport,
  getPayrollReport,
  getMonthlyPayrollReport,
};
