const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/authorization.middleware');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', protect, authorize(), notificationController.getNotifications);
router.get('/unread-count', protect, authorize(), notificationController.getUnreadCount);
router.patch('/read-all', protect, authorize(), notificationController.markAllAsRead);
router.patch('/:id/read', protect, authorize(), notificationController.markAsRead);

module.exports = router;
