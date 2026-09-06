const mongoose = require('mongoose');

const PRODUCTION_ORDER_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const productionOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'PO number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [80, 'PO number cannot exceed 80 characters'],
    },
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      trim: true,
      uppercase: true,
      maxlength: [80, 'Item code cannot exceed 80 characters'],
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    productionDescription: {
      type: String,
      required: [true, 'Production description is required'],
      trim: true,
      maxlength: [500, 'Production description cannot exceed 500 characters'],
    },
    orderedQuantity: {
      type: Number,
      required: true,
      min: [1, 'Ordered quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Ordered quantity must be a whole number',
      },
    },
    approvedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Approved quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Approved quantity must be a whole number',
      },
    },
    workerRate: {
      type: Number,
      required: true,
      min: [0, 'Worker rate cannot be negative'],
    },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: PRODUCTION_ORDER_STATUSES,
      default: 'PENDING',
    },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productionOrderSchema.pre('validate', function validateProductionOrder(next) {
  if (this.startDate && this.dueDate && this.dueDate < this.startDate) {
    this.invalidate('dueDate', 'Due date cannot be before the start date');
  }
  if (this.approvedQuantity > this.orderedQuantity) {
    this.invalidate('approvedQuantity', 'Approved production cannot exceed ordered quantity');
  }
  if (this.status === 'COMPLETED' && this.approvedQuantity !== this.orderedQuantity) {
    this.invalidate(
      'status',
      'A production order can only be completed when the full quantity is approved'
    );
  }
  next();
});

productionOrderSchema.virtual('producedQuantity').get(function getProducedQuantity() {
  return this.approvedQuantity;
});

productionOrderSchema.virtual('remainingQuantity').get(function getRemainingQuantity() {
  return Math.max(0, this.orderedQuantity - this.approvedQuantity);
});

productionOrderSchema.virtual('progressPercentage').get(function getProgressPercentage() {
  if (!this.orderedQuantity) return 0;
  return Math.round((this.approvedQuantity / this.orderedQuantity) * 100);
});

productionOrderSchema.statics.addApprovedQuantity = function addApprovedQuantity(
  orderId,
  quantity,
  updatedBy,
  options = {}
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Approved quantity increment must be a positive whole number');
  }

  const nextApprovedQuantity = {
    $add: [{ $ifNull: ['$approvedQuantity', 0] }, quantity],
  };

  return this.findOneAndUpdate(
    {
      _id: orderId,
      status: { $nin: ['COMPLETED', 'CANCELLED'] },
      $expr: {
        $lte: [nextApprovedQuantity, '$orderedQuantity'],
      },
    },
    [
      {
        $set: {
          approvedQuantity: nextApprovedQuantity,
          updatedBy,
          updatedAt: new Date(),
          status: {
            $cond: [
              { $eq: [nextApprovedQuantity, '$orderedQuantity'] },
              'COMPLETED',
              'IN_PROGRESS',
            ],
          },
        },
      },
    ],
    { new: true, session: options.session }
  );
};

productionOrderSchema.statics.removeApprovedQuantity = function removeApprovedQuantity(
  orderId,
  quantity,
  updatedBy
) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Approved quantity decrement must be a positive whole number');
  }
  const nextApprovedQuantity = {
    $subtract: [{ $ifNull: ['$approvedQuantity', 0] }, quantity],
  };
  return this.findOneAndUpdate(
    {
      _id: orderId,
      approvedQuantity: { $gte: quantity },
    },
    [
      {
        $set: {
          approvedQuantity: nextApprovedQuantity,
          updatedBy,
          updatedAt: new Date(),
          status: {
            $cond: [{ $eq: [nextApprovedQuantity, 0] }, 'PENDING', 'IN_PROGRESS'],
          },
        },
      },
    ],
    { new: true }
  );
};

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
module.exports.PRODUCTION_ORDER_STATUSES = PRODUCTION_ORDER_STATUSES;
