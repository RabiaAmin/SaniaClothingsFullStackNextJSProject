const mongoose = require('mongoose');

const PRODUCTION_ENTRY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
// PRODUCTION entries record pieces. A REVERSAL entry is an approved, negative-quantity offset
// linked to the production entry it reverses; the original is never deleted or overwritten.
const PRODUCTION_ENTRY_TYPES = ['PRODUCTION', 'REVERSAL'];

function isReversal(document) {
  return document?.entryType === 'REVERSAL';
}

const productionEntrySchema = new mongoose.Schema(
  {
    productionOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
      index: true,
      immutable: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
      immutable: true,
    },
    date: { type: Date, required: true },
    entryType: {
      type: String,
      enum: PRODUCTION_ENTRY_TYPES,
      default: 'PRODUCTION',
      immutable: true,
    },
    quantity: {
      type: Number,
      required: true,
      validate: [
        { validator: Number.isInteger, message: 'Quantity must be a whole number' },
        {
          validator(value) {
            return isReversal(this) || value >= 1;
          },
          message: 'Quantity must be at least 1',
        },
        {
          validator(value) {
            return !isReversal(this) || value <= -1;
          },
          message: 'A reversal quantity must be negative',
        },
      ],
    },
    unitRate: {
      type: Number,
      required: true,
      min: [0, 'Unit rate cannot be negative'],
      immutable: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      validate: {
        validator(value) {
          return isReversal(this) ? value <= 0 : value >= 0;
        },
        message: 'Total amount sign must match the entry type',
      },
    },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: PRODUCTION_ENTRY_STATUSES,
      default: 'PENDING',
      index: true,
    },
    // Admin or Production Manager who counted and recorded the pieces on the worker's behalf.
    // Null on historical worker-submitted entries, which keeps them distinguishable.
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      default: null,
      immutable: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    // Reversal audit, set once on the original entry. The original stays APPROVED so payroll
    // for its period is unchanged; the linked REVERSAL entry carries the deduction.
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    reversedAt: { type: Date, default: null },
    reversalReason: { type: String, default: '', trim: true, maxlength: 1000 },
    reversalEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionEntry', default: null },
    // On a REVERSAL entry: the production entry it offsets.
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionEntry',
      default: null,
      immutable: true,
    },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, default: '', trim: true, maxlength: 2000 },
    reviewLock: {
      type: {
        token: { type: String, required: true },
        reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
        decision: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
        acquiredAt: { type: Date, required: true },
      },
      default: null,
      select: false,
    },
  },
  { timestamps: true }
);

productionEntrySchema.pre('validate', function calculateTotal(next) {
  if (Number.isFinite(this.quantity) && Number.isFinite(this.unitRate)) {
    // Sign-symmetric rounding so a reversal amount exactly offsets the original amount.
    const amount = Math.abs(this.quantity * this.unitRate);
    this.totalAmount =
      (Math.sign(this.quantity) * Math.round((amount + Number.EPSILON) * 100)) / 100 || 0;
  }
  next();
});

productionEntrySchema.index({ productionOrder: 1, date: -1, createdAt: -1 });
productionEntrySchema.index({ worker: 1, date: -1, createdAt: -1 });
// Database-level guarantee that an entry can be reversed at most once.
productionEntrySchema.index(
  { reversalOf: 1 },
  { unique: true, partialFilterExpression: { reversalOf: { $type: 'objectId' } } }
);

module.exports = mongoose.model('ProductionEntry', productionEntrySchema);
module.exports.PRODUCTION_ENTRY_STATUSES = PRODUCTION_ENTRY_STATUSES;
module.exports.PRODUCTION_ENTRY_TYPES = PRODUCTION_ENTRY_TYPES;
