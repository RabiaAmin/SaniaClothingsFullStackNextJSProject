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
// Recording production approves it immediately, so callers need both permissions.
// Workers keep production_entry.create (assignment eligibility) but lack approve.
router.post(
  '/',
  protect,
  authorize('production_entry.create'),
  authorize('production_entry.approve'),
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
// Reversal is an approval-level correction, so it uses the same guards as recording.
router.patch(
  '/:id/reverse',
  protect,
  authorize('production_entry.create'),
  authorize('production_entry.approve'),
  productionEntryController.reverseProductionEntry
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
  // Workers are read-only; only managers may correct historical PENDING entries.
  authorize('production_entry.update_all'),
  productionEntryController.updateProductionEntry
);

module.exports = router;
