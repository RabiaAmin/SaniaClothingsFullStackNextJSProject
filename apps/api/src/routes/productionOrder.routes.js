const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const productionOrderController = require('../controllers/productionOrder.controller');

const router = express.Router();

router.get(
  '/',
  protect,
  authorize('production_order.read'),
  productionOrderController.getProductionOrders
);
router.post(
  '/',
  protect,
  authorize('production_order.create'),
  productionOrderController.createProductionOrder
);
router.get(
  '/:id',
  protect,
  authorize('production_order.read'),
  productionOrderController.getProductionOrder
);
router.put(
  '/:id',
  protect,
  authorize('production_order.update'),
  productionOrderController.updateProductionOrder
);
router.patch(
  '/:id/status',
  protect,
  authorize('production_order.update'),
  productionOrderController.updateProductionOrderStatus
);
router.delete(
  '/:id',
  protect,
  authorize('production_order.delete'),
  productionOrderController.deleteProductionOrder
);

module.exports = router;
