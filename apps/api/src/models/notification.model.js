const mongoose = require('mongoose');

const NOTIFICATION_TYPES = {
  PRODUCTION_ENTRY_SUBMITTED: 'PRODUCTION_ENTRY_SUBMITTED',
  PRODUCTION_ENTRY_APPROVED: 'PRODUCTION_ENTRY_APPROVED',
  PRODUCTION_ENTRY_REJECTED: 'PRODUCTION_ENTRY_REJECTED',
  PRODUCTION_ORDER_ASSIGNED: 'PRODUCTION_ORDER_ASSIGNED',
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    type: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 100,
      match: [/^[A-Z][A-Z0-9_]*$/, 'Invalid notification type'],
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    productionEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionEntry',
      default: null,
    },
    productionOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      default: null,
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
