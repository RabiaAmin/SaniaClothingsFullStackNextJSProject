const mongoose = require('mongoose');
const ProductionEntry = require('../models/productionEntry.model');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getProductionDeadline(dueDate) {
  const deadline = startOfUtcDay(dueDate);
  if (!deadline) return null;
  deadline.setUTCDate(deadline.getUTCDate() - 1);
  return deadline;
}

function buildProductionTracking(order, approvedQuantity = 0, now = new Date()) {
  const orderedQuantity = Math.max(0, Number(order?.orderedQuantity) || 0);
  const producedQuantity = Math.max(0, Number(approvedQuantity) || 0);
  const remainingQuantity = Math.max(0, orderedQuantity - producedQuantity);
  const progressPercentage = orderedQuantity
    ? Math.min(100, Math.max(0, Math.round((producedQuantity / orderedQuantity) * 100)))
    : 0;
  const productionDeadline = getProductionDeadline(order?.dueDate);
  const today = startOfUtcDay(now);
  const isCompleted = orderedQuantity > 0 && producedQuantity >= orderedQuantity;
  const isCancelled = order?.status === 'CANCELLED';
  const daysUntilDeadline =
    productionDeadline && today
      ? Math.round((productionDeadline.getTime() - today.getTime()) / DAY_IN_MS)
      : null;

  let calculatedStatus = 'NOT_STARTED';
  if (isCancelled) calculatedStatus = 'CANCELLED';
  else if (isCompleted) calculatedStatus = 'COMPLETED';
  else if (daysUntilDeadline !== null && daysUntilDeadline < 0) calculatedStatus = 'OVERDUE';
  else if (producedQuantity > 0) calculatedStatus = 'IN_PROGRESS';

  let deadlineStatus = null;
  if (!isCancelled && !isCompleted && daysUntilDeadline !== null) {
    if (daysUntilDeadline < 0) deadlineStatus = 'OVERDUE';
    else if (daysUntilDeadline <= 1) deadlineStatus = 'DUE_SOON';
  }

  return {
    approvedQuantity: producedQuantity,
    producedQuantity,
    remainingQuantity,
    progressPercentage,
    productionDeadline: productionDeadline?.toISOString() ?? null,
    calculatedStatus,
    deadlineStatus,
  };
}

async function getApprovedQuantities(orderIds) {
  const validIds = orderIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (validIds.length === 0) return new Map();

  const totals = await ProductionEntry.aggregate([
    {
      $match: {
        productionOrder: { $in: validIds },
        status: 'APPROVED',
      },
    },
    {
      $group: {
        _id: '$productionOrder',
        approvedQuantity: { $sum: '$quantity' },
      },
    },
  ]);

  return new Map(totals.map((total) => [String(total._id), total.approvedQuantity]));
}

function toPlainObject(order) {
  return typeof order?.toObject === 'function' ? order.toObject() : { ...order };
}

async function enrichProductionOrders(orders, now = new Date()) {
  const approvedQuantities = await getApprovedQuantities(orders.map((order) => order?._id));
  return orders.map((order) => {
    const plainOrder = toPlainObject(order);
    const approvedQuantity = approvedQuantities.get(String(plainOrder._id)) ?? 0;
    return {
      ...plainOrder,
      ...buildProductionTracking(plainOrder, approvedQuantity, now),
    };
  });
}

async function enrichProductionOrder(order, now = new Date()) {
  if (!order) return null;
  const [enrichedOrder] = await enrichProductionOrders([order], now);
  return enrichedOrder;
}

module.exports = {
  buildProductionTracking,
  enrichProductionOrder,
  enrichProductionOrders,
  getApprovedQuantities,
  getProductionDeadline,
};
