const mongoose = require('mongoose');

const invoiceStatementSchema = new mongoose.Schema(
  {
    statementNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    invoiceIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true }],
      validate: {
        validator: (invoiceIds) => invoiceIds.length > 0,
        message: 'At least one invoice is required',
      },
    },
    invoiceCount: { type: Number, required: true, min: 1 },
    clientName: { type: String, required: true, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    generatedAt: { type: Date, default: Date.now, required: true },
    pdf: {
      url: { type: String, required: true, trim: true },
      publicId: { type: String, required: true, trim: true },
    },
  },
  { timestamps: true }
);

invoiceStatementSchema.index({ generatedAt: -1, _id: -1 });

module.exports = mongoose.model('InvoiceStatement', invoiceStatementSchema);
