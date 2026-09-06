const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const payrollController = require('../controllers/payroll.controller');

const router = express.Router();

router.get('/pdf', protect, authorize('payroll.export_pdf'), payrollController.getPayrollPdfData);

router.get(
  '/range',
  protect,
  authorize('payroll.read_own', 'payroll.read_all'),
  payrollController.getPayroll
);

router.get(
  '/monthly',
  protect,
  authorize('payroll.read_own', 'payroll.read_all'),
  payrollController.getMonthlyPayroll
);

module.exports = router;
