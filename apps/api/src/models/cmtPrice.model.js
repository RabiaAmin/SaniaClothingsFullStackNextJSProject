const mongoose = require('mongoose');

const cmtPriceSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [80, 'Item code cannot exceed 80 characters'],
    },
    style: {
      type: String,
      required: [true, 'Style is required'],
      trim: true,
      maxlength: [200, 'Style cannot exceed 200 characters'],
    },
    cmtPrice: {
      type: Number,
      required: [true, 'CMT price is required'],
      min: [0, 'CMT price cannot be negative'],
    },
    workerPrice: {
      type: Number,
      required: [true, 'Worker price is required'],
      min: [0, 'Worker price cannot be negative'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CmtPrice', cmtPriceSchema);
