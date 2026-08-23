const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const payrollController = require('../controllers/payroll.controller');

const router = express.Router();

router.get(
  '/monthly',
  protect,
  authorize('payroll.read_own', 'payroll.read_all'),
  payrollController.getMonthlyPayroll
);

module.exports = router;
