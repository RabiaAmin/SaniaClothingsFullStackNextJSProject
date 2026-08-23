const express = require('express');
const router = express.Router();
const {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoice,
  getAllInvoices,
  getWeeklyStatements,
  getOrdersPerProduct,
  markAsPaid,
} = require('../controllers/invoice.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');

router.post('/create', protect, authorize('invoice.create'), createInvoice);
router.put('/update/:id', protect, authorize('invoice.update'), updateInvoice);
router.delete('/delete/:id', protect, authorize('invoice.delete'), deleteInvoice);
router.get('/get/:id', protect, authorize('invoice.read'), getInvoice);
router.get('/getAllOfThisMonth', protect, authorize('invoice.read'), getAllInvoices);
router.get('/weekly-statements', protect, authorize('invoice.read'), getWeeklyStatements);

router.put('/mark-as-paid', protect, authorize('invoice.update'), markAsPaid);

module.exports = router;
