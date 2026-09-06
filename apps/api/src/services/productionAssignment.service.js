const mongoose = require('mongoose');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const notificationService = require('./notification.service');
const { hasPermission } = require('./permission.service');

class ProductionAssignmentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ProductionAssignmentError';
    this.statusCode = statusCode;
  }
}

function isEligibleWorker(user) {
  return (
    user?.isActive !== false &&
    user?.role?.isActive !== false &&
    hasPermission(user, 'production_order.read') &&
    hasPermission(user, 'production_entry.create') &&
    hasPermission(user, 'production_entry.read_own')
  );
}

async function getAssignableWorkers(filter = {}) {
  const users = await User.find({ ...filter, isActive: { $ne: false } })
    .select('username email isActive role')
    .populate({ path: 'role', populate: { path: 'permissions' } })
    .sort({ username: 1 });
  return users.filter(isEligibleWorker);
}

async function resolveAssignedWorkerIds(value) {
  if (!Array.isArray(value)) {
    throw new ProductionAssignmentError('Assigned workers must be an array');
  }
  const uniqueIds = [...new Set(value.map(String))];
  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new ProductionAssignmentError('One or more assigned worker identifiers are invalid');
  }
  if (uniqueIds.length === 0) return [];

  const workers = await getAssignableWorkers({ _id: { $in: uniqueIds } });
  if (workers.length !== uniqueIds.length) {
    throw new ProductionAssignmentError(
      'Assigned workers must be active users who can record their own production'
    );
  }
  return uniqueIds;
}

async function notifyAssignedWorkers({ workerIds, order, actorId }) {
  if (workerIds.length === 0) return [];
  const itemCode = order.itemCode || 'Item code unavailable';
  return notificationService.createNotificationsForUsers({
    recipientIds: workerIds,
    type: Notification.NOTIFICATION_TYPES.PRODUCTION_ORDER_ASSIGNED,
    actor: actorId,
    message: `You were assigned to ${order.poNumber} (${itemCode}).`,
    productionOrder: order._id,
    metadata: { poNumber: order.poNumber, itemCode: order.itemCode ?? null },
  });
}

module.exports = {
  ProductionAssignmentError,
  getAssignableWorkers,
  isEligibleWorker,
  notifyAssignedWorkers,
  resolveAssignedWorkerIds,
};
