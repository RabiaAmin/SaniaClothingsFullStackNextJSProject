const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const { hasPermission } = require('../services/permission.service');
const { getMonthRange, getMonthlyPayrollReport } = require('../services/payroll.service');

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

  const canReadAll = hasPermission(req.user, 'payroll.read_all');
  let workerId = req.user._id;
  if (canReadAll) {
    workerId = req.query.workerId || null;
    if (workerId && !mongoose.isValidObjectId(workerId)) {
      return res.status(400).json({ success: false, message: 'Invalid worker identifier' });
    }
  }

  const report = await getMonthlyPayrollReport({ year, month, workerId });
  res.status(200).json({
    success: true,
    scope: canReadAll ? (workerId ? 'worker' : 'all') : 'own',
    report,
  });
});
