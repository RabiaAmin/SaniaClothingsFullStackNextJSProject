const express = require('express');
const controller = require('../controllers/invoiceArchive.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');

const router = express.Router();

// The state is a one-time, expiring server-side secret; callback completion does not rely on a browser cookie.
router.get('/google/callback', controller.googleCallback);
router.use(protect, authorize('invoice.archive'));
router.get('/google/status', controller.getDriveStatus);
router.post('/google/connect', controller.startDriveConnection);
router.delete('/google/connection', controller.disconnectDrive);
router.get('/eligible', controller.getEligibleInvoices);
router.post('/', controller.createArchive);
router.get('/', controller.listJobs);
router.get('/:id', controller.getJob);
router.post('/:id/confirm-deletion', controller.confirmDeletion);

module.exports = router;
