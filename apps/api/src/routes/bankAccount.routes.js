const express = require('express');
const router = express.Router();
const {
  createBankAccount,
  updateBankAccount,
  getBankAccount,
  deleteBankAccount,
  getAllBankAccounts,
} = require('../controllers/bankAccount.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');

router.post('/create', protect, authorize('bank_account.create'), createBankAccount);
router.put('/update/:id', protect, authorize('bank_account.update'), updateBankAccount);
router.get('/get/:id', protect, authorize('bank_account.read'), getBankAccount);
router.delete('/delete/:id', protect, authorize('bank_account.delete'), deleteBankAccount);
router.get('/getAll', protect, authorize('bank_account.read'), getAllBankAccounts);

module.exports = router;
