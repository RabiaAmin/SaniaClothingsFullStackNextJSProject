const mongoose = require('mongoose');
const ProductionEntry = require('../models/productionEntry.model');
const ProductionOrder = require('../models/productionOrder.model');

class ProductionEntryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ProductionEntryError';
    this.statusCode = statusCode;
  }
}

async function reviewProductionEntry({ entryId, reviewerId, decision, reviewNotes = '' }) {
  const session = await mongoose.startSession();
  let reviewedEntry;

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

      entry.status = decision;
      entry.reviewedBy = reviewerId;
      entry.reviewedAt = new Date();
      entry.reviewNotes = typeof reviewNotes === 'string' ? reviewNotes.trim() : '';
      await entry.save({ session });
      reviewedEntry = entry;
    });
  } catch (error) {
    if (
      error?.code === 20 ||
      /transaction numbers are only allowed|replica set member or mongos/i.test(error?.message)
    ) {
      throw new ProductionEntryError(
        'Production entry approval requires a transaction-capable MongoDB deployment',
        503
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (typeof reviewedEntry?.$session === 'function') reviewedEntry.$session(null);
  return reviewedEntry;
}

module.exports = { ProductionEntryError, reviewProductionEntry };
