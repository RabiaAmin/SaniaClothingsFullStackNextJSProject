const express = require("express");
const router = express.Router();
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getAllProducts,
} = require("../controllers/product.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create", protect, createProduct);
router.put("/update/:id", protect, updateProduct);
router.delete("/delete/:id", protect, deleteProduct);
router.get("/get/:id", getProduct);
router.get("/getAll", getAllProducts);

module.exports = router;
