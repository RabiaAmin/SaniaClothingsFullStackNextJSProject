const express = require('express');
const router = express.Router();
const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProduct,
  getAllProducts,
} = require('../controllers/product.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const uploadImages = require('../middleware/upload.middleware');

router.post('/create', protect, authorize('product.create'), uploadImages, createProduct);
router.put('/update/:id', protect, authorize('product.update'), uploadImages, updateProduct);
router.delete('/delete/:id', protect, authorize('product.delete'), deleteProduct);
router.get('/get/:id', getProduct);
router.get('/getAll', getAllProducts);

module.exports = router;
