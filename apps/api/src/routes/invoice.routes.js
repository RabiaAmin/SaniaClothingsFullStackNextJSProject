const express = require('express');
const router = express.Router();
const {
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoice,
  getAllInvoices,
  getStatementInvoices,
  generateStatements,
  getOrdersPerProduct,
  markAsPaid,
} = require('../controllers/invoice.controller');
const {
  createInvoiceStatement,
  getInvoiceStatements,
  getInvoiceStatement,
  deleteInvoiceStatement,
} = require('../controllers/invoiceStatement.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const { singleStatementPdf } = require('../middleware/upload.middleware');

router.post('/create', protect, authorize('invoice.create'), createInvoice);
router.put('/update/:id', protect, authorize('invoice.update'), updateInvoice);
router.delete('/delete/:id', protect, authorize('invoice.delete'), deleteInvoice);
router.get('/get/:id', protect, authorize('invoice.read'), getInvoice);
router.get('/getAllOfThisMonth', protect, authorize('invoice.read'), getAllInvoices);
router.get('/statement-invoices', protect, authorize('invoice.read'), getStatementInvoices);
router.post('/weekly-statements', protect, authorize('invoice.read'), generateStatements);
router.post(
  '/statement-history',
  protect,
  authorize('invoice.read'),
  singleStatementPdf,
  createInvoiceStatement
);
router.get('/statement-history', protect, authorize('invoice.read'), getInvoiceStatements);
router.get('/statement-history/:id', protect, authorize('invoice.read'), getInvoiceStatement);
router.delete(
  '/statement-history/:id',
  protect,
  authorize('invoice.delete'),
  deleteInvoiceStatement
);

router.put('/mark-as-paid', protect, authorize('invoice.update'), markAsPaid);

module.exports = router;
