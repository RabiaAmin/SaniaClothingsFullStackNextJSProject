const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const controller = require('../controllers/cmtPrice.controller');

const router = express.Router();

router.get(
  '/lookup/:itemCode',
  protect,
  authorize(
    'invoice.create',
    'invoice.update',
    'production_order.create',
    'production_order.update'
  ),
  controller.lookupCmtPrice
);
router.get('/', protect, authorize('cmt_price.read'), controller.getCmtPrices);
router.post('/', protect, authorize('cmt_price.create'), controller.createCmtPrice);
router.put('/:id', protect, authorize('cmt_price.update'), controller.updateCmtPrice);
router.delete('/:id', protect, authorize('cmt_price.delete'), controller.deleteCmtPrice);

module.exports = router;
