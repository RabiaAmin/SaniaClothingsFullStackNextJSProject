const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const asyncHandler = require('../utils/asyncHandler');

const POPULATE_FIELDS = [
  { path: 'actor', select: 'username email' },
  { path: 'productionEntry', select: 'date quantity unitRate totalAmount status' },
  { path: 'productionOrder', select: 'poNumber itemCode productionDescription status' },
];

exports.getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = { recipient: req.user._id };
  if (req.query.unreadOnly === 'true') filter.isRead = false;

  const [notifications, totalRecords] = await Promise.all([
    Notification.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    notifications,
    page,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    totalRecords,
  });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });
  res.status(200).json({ success: true, unreadCount });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid notification identifier' });
  }
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  ).populate(POPULATE_FIELDS);
  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }
  res.status(200).json({ success: true, notification });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount,
  });
});
