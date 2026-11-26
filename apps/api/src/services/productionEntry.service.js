const mongoose = require('mongoose');
const crypto = require('crypto');
const ProductionEntry = require('../models/productionEntry.model');
const ProductionOrder = require('../models/productionOrder.model');
const Notification = require('../models/notification.model');
const notificationService = require('./notification.service');
const { getAssignableWorkers, isWorkerAssigned } = require('./productionAssignment.service');
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

// Production dates are calendar days stored as UTC midnight. The future-date bound allows the
// latest time zone (UTC+14) so a manager's local 'today' is never rejected early in the day.
const MAX_TIMEZONE_OFFSET_MS = 14 * 60 * 60 * 1000;

function toUtcDay(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Authoritative production-date rule: not in the future and not before the order start date.
// Dates after the due date are allowed because overdue orders must still be completable.
function validateProductionDate(date, order, now = new Date()) {
  const day = toUtcDay(date);
  if (!day) throw new ProductionEntryError('Please provide a valid production date', 400);
  const latestAllowed = toUtcDay(now.getTime() + MAX_TIMEZONE_OFFSET_MS);
  if (day > latestAllowed) {
    throw new ProductionEntryError('Production date cannot be in the future', 400);
  }
  const startDay = toUtcDay(order?.startDate);
  if (startDay && day < startDay) {
    throw new ProductionEntryError(
      `Production date cannot be before the order start date (${startDay.toISOString().slice(0, 10)})`,
      400
    );
  }
  return day;
}

// Keeps other Admin/Production Managers (approvers) informed of recorded or reversed production
// for the Production Manager PWA. The acting manager and the worker (notified separately) are
// excluded. The write is already persisted, so failures are logged and never fail the request.
async function notifyOtherProductionManagers({ actorId, workerId, ...notification }) {
  try {
    await notificationService.createNotificationsForAnyPermission({
      permissions: ['production_entry.approve'],
      excludeUserIds: [actorId, workerId],
      actor: actorId,
      ...notification,
    });
  } catch (notificationError) {
    console.error('Failed to create production manager notifications:', notificationError.message);
  }
}

const EXCEEDS_REMAINING_MESSAGE =
  'This quantity exceeds the remaining order quantity or the production order is closed';

// Admin/Production Manager records pieces they physically counted for an assigned worker.
// The entry is created APPROVED and the order's approved quantity is incremented with the
// same bounded atomic update used by review approval, so progress and payroll stay consistent.
async function recordProductionEntry({
  productionOrderId,
  workerId,
  recorderId,
  recorderName,
  date,
  quantity,
  notes = '',
  now = new Date(),
}) {
  const order = await ProductionOrder.findById(productionOrderId);
  if (!order) throw new ProductionEntryError('Production order not found', 404);
  if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
    throw new ProductionEntryError('Production cannot be recorded against a closed order', 409);
  }
  validateProductionDate(date, order, now);
  if (!isWorkerAssigned(order, workerId)) {
    throw new ProductionEntryError(
      'The selected worker is not assigned to this production order',
      400
    );
  }
  if (String(workerId) === String(recorderId)) {
    throw new ProductionEntryError('You cannot record and approve your own production', 403);
  }
  const [worker] = await getAssignableWorkers({ _id: workerId, deletedAt: null });
  if (!worker) {
    throw new ProductionEntryError(
      'The selected worker is no longer an active worker and cannot receive production',
      400
    );
  }
  const remainingQuantity = order.orderedQuantity - (order.approvedQuantity ?? 0);
  if (quantity > remainingQuantity) {
    throw new ProductionEntryError(
      `Quantity cannot exceed the remaining order quantity (${Math.max(remainingQuantity, 0)})`,
      409
    );
  }

  const reviewedAt = new Date();
  const document = {
    productionOrder: order._id,
    worker: workerId,
    date,
    quantity,
    unitRate: order.workerRate,
    totalAmount: quantity * order.workerRate,
    notes,
    status: 'APPROVED',
    recordedBy: recorderId,
    reviewedBy: recorderId,
    reviewedAt,
  };

  const session = await mongoose.startSession();
  let recordedEntry;
  let useStandaloneFallback = false;
  try {
    await session.withTransaction(async () => {
      const updatedOrder = await ProductionOrder.addApprovedQuantity(
        order._id,
        quantity,
        recorderId,
        { session }
      );
      if (!updatedOrder) throw new ProductionEntryError(EXCEEDS_REMAINING_MESSAGE, 409);
      const [created] = await ProductionEntry.create([document], { session });
      recordedEntry = created;
    });
  } catch (error) {
    if (isTransactionSupportError(error)) useStandaloneFallback = true;
    else throw error;
  } finally {
    await session.endSession();
  }

  if (useStandaloneFallback) {
    recordedEntry = await recordProductionEntryWithoutTransaction({ order, document, recorderId });
  } else if (typeof recordedEntry?.$session === 'function') {
    recordedEntry.$session(null);
  }

  try {
    await notificationService.createNotificationsForUsers({
      recipientIds: [workerId],
      type: NOTIFICATION_TYPES.PRODUCTION_ENTRY_APPROVED,
      actor: recorderId,
      message: `${recorderName} recorded ${quantity} approved pieces for you on ${order.poNumber}.`,
      productionEntry: recordedEntry._id,
      productionOrder: order._id,
      metadata: { quantity, poNumber: order.poNumber },
    });
  } catch (notificationError) {
    // The approved entry is already persisted. Failing the request would invite a retry that
    // double-counts the pieces, so notification failure is isolated.
    console.error('Failed to create production recorded notification:', notificationError.message);
  }
  await notifyOtherProductionManagers({
    actorId: recorderId,
    workerId,
    type: NOTIFICATION_TYPES.PRODUCTION_ENTRY_RECORDED,
    message: `${recorderName} recorded ${quantity} pieces for ${worker.username ?? 'a worker'} on ${order.poNumber}.`,
    productionEntry: recordedEntry._id,
    productionOrder: order._id,
    metadata: { quantity, poNumber: order.poNumber },
  });

  return recordedEntry;
}

async function recordProductionEntryWithoutTransaction({ order, document, recorderId }) {
  const updatedOrder = await ProductionOrder.addApprovedQuantity(
    order._id,
    document.quantity,
    recorderId
  );
  if (!updatedOrder) throw new ProductionEntryError(EXCEEDS_REMAINING_MESSAGE, 409);
  try {
    return await ProductionEntry.create(document);
  } catch (error) {
    await ProductionOrder.removeApprovedQuantity(order._id, document.quantity, recorderId);
    throw error;
  }
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

const REVERSAL_REASON_MAX_LENGTH = 1000;

// Explains why an entry could not be claimed for reversal.
async function explainUnreversibleEntry(entryId, session) {
  const query = ProductionEntry.findById(entryId);
  const existing = session ? await query.session(session) : await query;
  if (!existing) return new ProductionEntryError('Production entry not found', 404);
  if (existing.entryType === 'REVERSAL') {
    return new ProductionEntryError('A reversal entry cannot itself be reversed', 409);
  }
  if (existing.reversedAt) {
    return new ProductionEntryError('This production entry has already been reversed', 409);
  }
  return new ProductionEntryError('Only approved production entries can be reversed', 409);
}

function buildReversalDocument(original, { reverserId, reason, reversedAt }) {
  // The offset is dated on the reversal day, so payroll for the original entry's period is
  // never rewritten. The deduction lands in the period in which the reversal happens.
  // (Legacy future-dated originals keep their own date as the earliest offset date.)
  const today = toUtcDay(reversedAt);
  const originalDay = toUtcDay(original.date) ?? today;
  return {
    productionOrder: original.productionOrder,
    worker: original.worker,
    date: originalDay > today ? originalDay : today,
    quantity: -original.quantity,
    unitRate: original.unitRate,
    totalAmount: -original.quantity * original.unitRate,
    notes: `Reversal: ${reason}`,
    status: 'APPROVED',
    entryType: 'REVERSAL',
    reversalOf: original._id,
    recordedBy: reverserId,
    reviewedBy: reverserId,
    reviewedAt: reversedAt,
  };
}

// Reverses an approved production entry with a mandatory reason. The original stays APPROVED
// and permanently keeps its quantity, plus reversedBy/reversedAt/reversalReason. A linked,
// approved REVERSAL entry with negative quantity offsets progress and earnings. Approved order
// progress is decremented atomically, and the claim on the original prevents duplicate reversals.
async function reverseProductionEntry({
  entryId,
  reverserId,
  reverserName,
  reason,
  now = new Date(),
}) {
  const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
  if (!normalizedReason) {
    throw new ProductionEntryError('A reason is required to reverse a production entry', 400);
  }
  if (normalizedReason.length > REVERSAL_REASON_MAX_LENGTH) {
    throw new ProductionEntryError(
      `The reversal reason cannot exceed ${REVERSAL_REASON_MAX_LENGTH} characters`,
      400
    );
  }

  const original = await ProductionEntry.findById(entryId);
  if (!original) throw new ProductionEntryError('Production entry not found', 404);
  if (original.worker.equals(reverserId)) {
    throw new ProductionEntryError('You cannot reverse your own production entry', 403);
  }

  const reversedAt = now;
  const claimFilter = {
    _id: entryId,
    status: 'APPROVED',
    entryType: { $ne: 'REVERSAL' },
    reversedAt: null,
  };
  const claimUpdate = {
    $set: { reversedBy: reverserId, reversedAt, reversalReason: normalizedReason },
  };

  const session = await mongoose.startSession();
  let result;
  let useStandaloneFallback = false;
  try {
    await session.withTransaction(async () => {
      const claimed = await ProductionEntry.findOneAndUpdate(claimFilter, claimUpdate, {
        new: true,
        session,
      });
      if (!claimed) throw await explainUnreversibleEntry(entryId, session);

      const order = await ProductionOrder.removeApprovedQuantity(
        claimed.productionOrder,
        claimed.quantity,
        reverserId,
        { session }
      );
      if (!order) {
        throw new ProductionEntryError(
          'The production order no longer holds enough approved quantity to reverse this entry',
          409
        );
      }

      const [reversalEntry] = await ProductionEntry.create(
        [buildReversalDocument(claimed, { reverserId, reason: normalizedReason, reversedAt })],
        { session }
      );
      claimed.reversalEntry = reversalEntry._id;
      await ProductionEntry.updateOne(
        { _id: claimed._id },
        { $set: { reversalEntry: reversalEntry._id } },
        { session }
      );
      result = { original: claimed, reversalEntry, poNumber: order.poNumber };
    });
  } catch (error) {
    if (isTransactionSupportError(error)) useStandaloneFallback = true;
    else throw error;
  } finally {
    await session.endSession();
  }

  if (useStandaloneFallback) {
    result = await reverseProductionEntryWithoutTransaction({
      entryId,
      reverserId,
      reason: normalizedReason,
      reversedAt,
      claimFilter,
      claimUpdate,
    });
  } else {
    for (const document of [result.original, result.reversalEntry]) {
      if (typeof document?.$session === 'function') document.$session(null);
    }
  }

  try {
    await notificationService.createNotificationsForUsers({
      recipientIds: [result.original.worker],
      type: NOTIFICATION_TYPES.PRODUCTION_ENTRY_REVERSED,
      actor: reverserId,
      message:
        `${reverserName} reversed ${result.original.quantity} pieces recorded for you on ${result.poNumber ?? 'a production order'}. Reason: ${normalizedReason}`.slice(
          0,
          500
        ),
      productionEntry: result.original._id,
      productionOrder: result.original.productionOrder,
      metadata: {
        quantity: result.original.quantity,
        poNumber: result.poNumber ?? null,
        reversalEntry: String(result.reversalEntry._id),
      },
    });
  } catch (notificationError) {
    console.error('Failed to create production reversal notification:', notificationError.message);
  }
  await notifyOtherProductionManagers({
    actorId: reverserId,
    workerId: result.original.worker,
    type: NOTIFICATION_TYPES.PRODUCTION_ENTRY_REVERSED,
    message:
      `${reverserName} reversed ${result.original.quantity} pieces on ${result.poNumber ?? 'a production order'}. Reason: ${normalizedReason}`.slice(
        0,
        500
      ),
    productionEntry: result.original._id,
    productionOrder: result.original.productionOrder,
    metadata: { quantity: result.original.quantity, poNumber: result.poNumber ?? null },
  });

  return result;
}

async function reverseProductionEntryWithoutTransaction({
  entryId,
  reverserId,
  reason,
  reversedAt,
  claimFilter,
  claimUpdate,
}) {
  // The atomic claim on the original is the duplicate-reversal guard (backed by the unique
  // reversalOf index). Each later step is compensated if a subsequent step fails.
  const claimed = await ProductionEntry.findOneAndUpdate(claimFilter, claimUpdate, { new: true });
  if (!claimed) throw await explainUnreversibleEntry(entryId);
  const releaseClaim = () =>
    ProductionEntry.updateOne(
      { _id: claimed._id, reversalEntry: null },
      { $set: { reversedBy: null, reversedAt: null, reversalReason: '' } }
    );

  const order = await ProductionOrder.removeApprovedQuantity(
    claimed.productionOrder,
    claimed.quantity,
    reverserId
  );
  if (!order) {
    await releaseClaim();
    throw new ProductionEntryError(
      'The production order no longer holds enough approved quantity to reverse this entry',
      409
    );
  }

  let reversalEntry;
  try {
    reversalEntry = await ProductionEntry.create(
      buildReversalDocument(claimed, { reverserId, reason, reversedAt })
    );
  } catch (error) {
    await ProductionOrder.addApprovedQuantity(
      claimed.productionOrder,
      claimed.quantity,
      reverserId
    );
    await releaseClaim();
    throw error;
  }
  await ProductionEntry.updateOne(
    { _id: claimed._id },
    { $set: { reversalEntry: reversalEntry._id } }
  );
  claimed.reversalEntry = reversalEntry._id;
  return { original: claimed, reversalEntry, poNumber: order.poNumber };
}

module.exports = {
  ProductionEntryError,
  validateProductionDate,
  reverseProductionEntry,
  reverseProductionEntryWithoutTransaction,
  recordProductionEntry,
  recordProductionEntryWithoutTransaction,
  reviewProductionEntry,
  reviewProductionEntryWithoutTransaction,
};
