const express = require("express");
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
} = require("../controllers/invoice.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create", protect, createInvoice);
router.put("/update/:id", protect, updateInvoice);
router.delete("/delete/:id", protect, deleteInvoice);
router.get("/get/:id", protect, getInvoice);
router.get("/getAllOfThisMonth", protect, getAllInvoices);
router.get("/weekly-statements", protect, getWeeklyStatements);
router.get("/getOrdersPerProduct", protect, getOrdersPerProduct);
router.put("/mark-as-paid", protect, markAsPaid);

module.exports = router;
