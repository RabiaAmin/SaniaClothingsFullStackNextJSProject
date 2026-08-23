const ProductionEntry = require('../models/productionEntry.model');

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
      year: period.year,
      month: period.month,
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

async function getMonthlyPayrollReport({ year, month, workerId }) {
  const period = getMonthRange(year, month);
  if (!period) return null;

  const filter = {
    status: 'APPROVED',
    date: { $gte: period.start, $lt: period.end },
  };
  if (workerId) filter.worker = workerId;

  const entries = await ProductionEntry.find(filter)
    .select('productionOrder worker date quantity unitRate status')
    .populate({
      path: 'productionOrder',
      select: 'poNumber productionDescription product',
      populate: { path: 'product', select: 'name' },
    })
    .populate({ path: 'worker', select: 'username email' })
    .sort({ worker: 1, date: 1, createdAt: 1 })
    .lean();

  return buildMonthlyPayrollReport(entries, period);
}

module.exports = {
  roundMoney,
  getMonthRange,
  buildMonthlyPayrollReport,
  getMonthlyPayrollReport,
};
