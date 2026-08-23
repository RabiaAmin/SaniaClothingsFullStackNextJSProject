const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const productionEntryController = require('../controllers/productionEntry.controller');

const router = express.Router();

router.get(
  '/',
  protect,
  authorize('production_entry.read_own', 'production_entry.read_all'),
  productionEntryController.getProductionEntries
);
router.post(
  '/',
  protect,
  authorize('production_entry.create'),
  productionEntryController.createProductionEntry
);
router.patch(
  '/:id/approve',
  protect,
  authorize('production_entry.approve'),
  productionEntryController.approveProductionEntry
);
router.patch(
  '/:id/reject',
  protect,
  authorize('production_entry.reject'),
  productionEntryController.rejectProductionEntry
);
router.get(
  '/:id',
  protect,
  authorize('production_entry.read_own', 'production_entry.read_all'),
  productionEntryController.getProductionEntry
);
router.put(
  '/:id',
  protect,
  authorize('production_entry.update_own', 'production_entry.update_all'),
  productionEntryController.updateProductionEntry
);

module.exports = router;
