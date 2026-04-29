const express = require("express");
const router = express.Router();
const {
  createBankAccount,
  updateBankAccount,
  getBankAccount,
  deleteBankAccount,
  getAllBankAccounts,
} = require("../controllers/bankAccount.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create", protect, createBankAccount);
router.put("/update/:id", protect, updateBankAccount);
router.get("/get/:id", protect, getBankAccount);
router.delete("/delete/:id", protect, deleteBankAccount);
router.get("/getAll", protect, getAllBankAccounts);

module.exports = router;
