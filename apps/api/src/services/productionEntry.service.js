const mongoose = require('mongoose');
const crypto = require('crypto');
const ProductionEntry = require('../models/productionEntry.model');
const ProductionOrder = require('../models/productionOrder.model');
const Notification = require('../models/notification.model');
const notificationService = require('./notification.service');
const { NOTIFICATION_TYPES } = Notification;

class ProductionEntryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ProductionEntryError';
    this.statusCode = statusCode;
  }
}

function isTransactionSupportError(error) {
  return (
    error?.code === 20 ||
    /transaction numbers are only allowed|replica set member or mongos/i.test(error?.message)
  );
}

async function submitProductionEntry({
  productionOrderId,
  workerId,
  workerName,
  date,
  quantity,
  notes = '',
}) {
  const order = await ProductionOrder.findById(productionOrderId);
  if (!order) throw new ProductionEntryError('Production order not found', 404);
  if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
    throw new ProductionEntryError('Production cannot be recorded against a closed order', 409);
  }
  const assignedWorkerIds = (order.assignedWorkers ?? []).map(String);
  if (assignedWorkerIds.length > 0 && !assignedWorkerIds.includes(String(workerId))) {
    throw new ProductionEntryError(
      'You are not assigned to this production order and cannot record production against it',
      403
    );
  }
  if (quantity > order.orderedQuantity) {
    throw new ProductionEntryError(
      'An entry quantity cannot exceed the production order quantity',
      409
    );
  }

  const submittedEntry = await ProductionEntry.create({
    productionOrder: order._id,
    worker: workerId,
    date,
    quantity,
    unitRate: order.workerRate,
    totalAmount: quantity * order.workerRate,
    notes,
  });

  try {
    await notificationService.createNotificationsForAnyPermission({
      permissions: ['production_entry.approve', 'production_entry.reject'],
      excludeUserIds: [workerId],
      type: NOTIFICATION_TYPES.PRODUCTION_ENTRY_SUBMITTED,
      actor: workerId,
      message: `${workerName} submitted ${quantity} pieces for ${order.poNumber}.`,
      productionEntry: submittedEntry._id,
      productionOrder: order._id,
      metadata: { quantity, poNumber: order.poNumber },
    });
  } catch (notificationError) {
    // The entry is already persisted. Returning an error would encourage a retry and
    // duplicate the worker's production claim, so notification failure is isolated.
    console.error(
      'Failed to create production submission notifications:',
      notificationError.message
    );
  }

  return submittedEntry;
}

async function reviewProductionEntry({ entryId, reviewerId, decision, reviewNotes = '' }) {
  const session = await mongoose.startSession();
  let reviewedEntry;
  let useStandaloneFallback = false;

  try {
    await session.withTransaction(async () => {
      const entry = await ProductionEntry.findOne({ _id: entryId, status: 'PENDING' }).session(
        session
      );
      if (!entry) {
        const existing = await ProductionEntry.findById(entryId).session(session);
        if (!existing) throw new ProductionEntryError('Production entry not found', 404);
        throw new ProductionEntryError('Only pending production entries can be reviewed', 409);
      }

      if (entry.worker.equals(reviewerId)) {
        throw new ProductionEntryError('You cannot review your own production entry', 403);
      }

      if (decision === 'APPROVED') {
        const order = await ProductionOrder.addApprovedQuantity(
          entry.productionOrder,
          entry.quantity,
          reviewerId,
          { session }
        );
        if (!order) {
          throw new ProductionEntryError(
            'This entry exceeds the remaining quantity or the production order is closed',
            409
          );
        }
      }

      const order = await ProductionOrder.findById(entry.productionOrder)
        .select('poNumber')
        .session(session);

      entry.status = decision;
      entry.reviewedBy = reviewerId;
      entry.reviewedAt = new Date();
      entry.reviewNotes = typeof reviewNotes === 'string' ? reviewNotes.trim() : '';
      await entry.save({ session });
      await notificationService.createNotificationsForUsers({
        recipientIds: [entry.worker],
        type:
          decision === 'APPROVED'
            ? NOTIFICATION_TYPES.PRODUCTION_ENTRY_APPROVED
            : NOTIFICATION_TYPES.PRODUCTION_ENTRY_REJECTED,
        actor: reviewerId,
        message: `Your production entry of ${entry.quantity} pieces for ${order?.poNumber ?? 'the production order'} was ${decision.toLowerCase()}.`,
        productionEntry: entry._id,
        productionOrder: entry.productionOrder,
        metadata: { quantity: entry.quantity, poNumber: order?.poNumber ?? null },
        session,
      });
      reviewedEntry = entry;
    });
  } catch (error) {
    if (isTransactionSupportError(error)) useStandaloneFallback = true;
    else throw error;
  } finally {
    await session.endSession();
  }

  if (useStandaloneFallback) {
    return reviewProductionEntryWithoutTransaction({
      entryId,
      reviewerId,
      decision,
      reviewNotes,
    });
  }

  if (typeof reviewedEntry?.$session === 'function') reviewedEntry.$session(null);
  return reviewedEntry;
}

async function reviewProductionEntryWithoutTransaction({
  entryId,
  reviewerId,
  decision,
  reviewNotes = '',
}) {
  const existing = await ProductionEntry.findById(entryId);
  if (!existing) throw new ProductionEntryError('Production entry not found', 404);
  if (existing.status !== 'PENDING') {
    throw new ProductionEntryError('Only pending production entries can be reviewed', 409);
  }
  if (existing.worker.equals(reviewerId)) {
    throw new ProductionEntryError('You cannot review your own production entry', 403);
  }

  const token = crypto.randomUUID();
  const reviewedAt = new Date();
  const normalizedNotes = typeof reviewNotes === 'string' ? reviewNotes.trim() : '';
  const claimed = await ProductionEntry.findOneAndUpdate(
    {
      _id: entryId,
      status: 'PENDING',
      $or: [{ reviewLock: null }, { reviewLock: { $exists: false } }],
    },
    {
      $set: {
        reviewLock: { token, reviewer: reviewerId, decision, acquiredAt: reviewedAt },
      },
    },
    { new: true }
  );
  if (!claimed) {
    throw new ProductionEntryError('This production entry is already being reviewed', 409);
  }

  let orderApplied = false;
  try {
    if (decision === 'APPROVED') {
      const order = await ProductionOrder.addApprovedQuantity(
        claimed.productionOrder,
        claimed.quantity,
        reviewerId
      );
      if (!order) {
        await ProductionEntry.updateOne(
          { _id: entryId, 'reviewLock.token': token },
          { $set: { reviewLock: null } }
        );
        throw new ProductionEntryError(
          'This entry exceeds the remaining quantity or the production order is closed',
          409
        );
      }
      orderApplied = true;
    }

    const finalized = await ProductionEntry.findOneAndUpdate(
      { _id: entryId, status: 'PENDING', 'reviewLock.token': token },
      {
        $set: {
          status: decision,
          reviewedBy: reviewerId,
          reviewedAt,
          reviewNotes: normalizedNotes,
          reviewLock: null,
        },
      },
      { new: true }
    );
    if (!finalized) {
      throw new Error('The claimed production entry could not be finalized');
    }

    const order = await ProductionOrder.findById(finalized.productionOrder).select('poNumber');
    try {
      await notificationService.createNotificationsForUsers({
        recipientIds: [finalized.worker],
        type:
          decision === 'APPROVED'
            ? NOTIFICATION_TYPES.PRODUCTION_ENTRY_APPROVED
            : NOTIFICATION_TYPES.PRODUCTION_ENTRY_REJECTED,
        actor: reviewerId,
        message: `Your production entry of ${finalized.quantity} pieces for ${order?.poNumber ?? 'the production order'} was ${decision.toLowerCase()}.`,
        productionEntry: finalized._id,
        productionOrder: finalized.productionOrder,
        metadata: { quantity: finalized.quantity, poNumber: order?.poNumber ?? null },
      });
    } catch (notificationError) {
      console.error('Failed to create production review notification:', notificationError.message);
    }
    return finalized;
  } catch (error) {
    if (orderApplied) {
      await ProductionOrder.removeApprovedQuantity(
        claimed.productionOrder,
        claimed.quantity,
        reviewerId
      );
    }
    await ProductionEntry.updateOne(
      { _id: entryId, 'reviewLock.token': token },
      { $set: { reviewLock: null } }
    );
    throw error;
  }
}

module.exports = {
  ProductionEntryError,
  submitProductionEntry,
  reviewProductionEntry,
  reviewProductionEntryWithoutTransaction,
};
