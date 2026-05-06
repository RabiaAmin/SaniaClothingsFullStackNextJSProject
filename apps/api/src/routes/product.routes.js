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
const uploadImages = require("../middleware/upload.middleware");

router.post("/create", protect, uploadImages, createProduct);
router.put("/update/:id", protect, uploadImages, updateProduct);
router.delete("/delete/:id", protect, deleteProduct);
router.get("/get/:id", getProduct);
router.get("/getAll", getAllProducts);

module.exports = router;
