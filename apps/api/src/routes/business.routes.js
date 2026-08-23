const express = require('express');
const router = express.Router();
const {
  createBusiness,
  updateBusiness,
  getBusiness,
} = require('../controllers/business.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');

router.post('/create', protect, authorize('business.create'), createBusiness);
router.put('/update', protect, authorize('business.update'), updateBusiness);
router.get('/get', getBusiness);

module.exports = router;
