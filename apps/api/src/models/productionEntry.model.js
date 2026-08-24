const mongoose = require('mongoose');

const PRODUCTION_ENTRY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

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
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
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
      min: [0, 'Total amount cannot be negative'],
    },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: PRODUCTION_ENTRY_STATUSES,
      default: 'PENDING',
      index: true,
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
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
    this.totalAmount = Math.round((this.quantity * this.unitRate + Number.EPSILON) * 100) / 100;
  }
  next();
});

productionEntrySchema.index({ productionOrder: 1, date: -1, createdAt: -1 });
productionEntrySchema.index({ worker: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('ProductionEntry', productionEntrySchema);
module.exports.PRODUCTION_ENTRY_STATUSES = PRODUCTION_ENTRY_STATUSES;
