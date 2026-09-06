const mongoose = require('mongoose');
const Business = require('../models/business.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');
const { hasPermission } = require('../services/permission.service');
const {
  getDateRange,
  getMonthRange,
  getPayrollReport,
  getMonthlyPayrollReport,
} = require('../services/payroll.service');

function payrollScope(req, res) {
  const canReadAll = hasPermission(req.user, 'payroll.read_all');
  const workerId = canReadAll ? req.query.workerId || null : req.user._id;
  if (canReadAll && workerId && !mongoose.isValidObjectId(workerId)) {
    res.status(400).json({ success: false, message: 'Invalid worker identifier' });
    return null;
  }
  return { canReadAll, workerId };
}

function sendPayrollReport(res, scope, report) {
  res.status(200).json({
    success: true,
    scope: scope.canReadAll ? (scope.workerId ? 'worker' : 'all') : 'own',
    report,
  });
}

exports.getPayroll = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Start date and end date are required',
    });
  }
  if (!getDateRange(startDate, endDate)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid date range where start date is not after end date',
    });
  }

  const scope = payrollScope(req, res);
  if (!scope) return;
  const report = await getPayrollReport({ startDate, endDate, workerId: scope.workerId });
  sendPayrollReport(res, scope, report);
});

exports.getPayrollPdfData = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Start date and end date are required',
    });
  }
  if (!getDateRange(startDate, endDate)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid date range where start date is not after end date',
    });
  }

  const scope = payrollScope(req, res);
  if (!scope) return;
  const [report, business, selectedWorker] = await Promise.all([
    getPayrollReport({ startDate, endDate, workerId: scope.workerId }),
    Business.findOne().select('name email phone telPhone address vatNumber ckNumber fax').lean(),
    scope.workerId
      ? User.findById(scope.workerId).select('username email').lean()
      : Promise.resolve(null),
  ]);

  if (scope.workerId && !selectedWorker) {
    return res.status(404).json({ success: false, message: 'Worker not found' });
  }

  res.status(200).json({ success: true, report, business, selectedWorker });
});

exports.getMonthlyPayroll = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = req.query.year ?? now.getUTCFullYear();
  const month = req.query.month ?? now.getUTCMonth() + 1;
  if (!getMonthRange(year, month)) {
    return res.status(400).json({
      success: false,
      message: 'Month must be between 1 and 12 and year must be between 2000 and 2200',
    });
  }

  const scope = payrollScope(req, res);
  if (!scope) return;

  const report = await getMonthlyPayrollReport({
    year,
    month,
    workerId: scope.workerId,
  });
  sendPayrollReport(res, scope, report);
});
