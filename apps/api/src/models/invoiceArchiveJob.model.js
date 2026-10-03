const mongoose = require('mongoose');

const ACTIVE_STATUSES = [
  'PREPARING',
  'UPLOADING',
  'VERIFYING',
  'READY_FOR_CONFIRMATION',
  'DELETING',
];

const invoiceArchiveJobSchema = new mongoose.Schema(
  {
    archiveId: { type: String, required: true, unique: true, immutable: true },
    activeLock: { type: String, default: 'invoice-archive', immutable: true },
    isActive: { type: Boolean, default: true, index: true },
    idempotencyKey: { type: String, sparse: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: [...ACTIVE_STATUSES, 'COMPLETED', 'FAILED'],
      default: 'PREPARING',
    },
    retentionCutoff: { type: Date, required: true },
    expectedInvoiceCount: { type: Number, required: true, min: 0 },
    invoiceRecords: [
      {
        _id: false,
        invoiceId: { type: String, required: true },
        invoiceNumber: { type: String, default: '' },
        invoiceDate: { type: Date, required: true },
        documentChecksum: { type: String, required: true },
        originalDocument: { type: mongoose.Schema.Types.Mixed, required: true },
      },
    ],
    snapshotChecksum: { type: String, default: '' },
    manifestChecksum: { type: String, default: '' },
    driveFolderId: { type: String, default: '' },
    driveFolderUrl: { type: String, default: '' },
    files: [
      {
        _id: false,
        name: String,
        mimeType: String,
        driveFileId: String,
        checksum: String,
        size: Number,
        verified: { type: Boolean, default: false },
      },
    ],
    verification: {
      verifiedAt: Date,
      invoiceIdsMatched: { type: Boolean, default: false },
      allFilesMatched: { type: Boolean, default: false },
    },
    deletedCount: { type: Number, default: 0 },
    deletedInvoiceIds: [{ type: String }],
    deletionSkipped: [{ invoiceId: String, reason: String }],
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    confirmedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    completedAt: { type: Date, default: null },
    error: { code: String, message: String, at: Date },
  },
  { timestamps: true }
);

invoiceArchiveJobSchema.index(
  { activeLock: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'one_active_invoice_archive_job',
  }
);
invoiceArchiveJobSchema.index({ createdAt: -1 });

invoiceArchiveJobSchema.pre('save', function synchronizeActiveLock(next) {
  this.isActive = ACTIVE_STATUSES.includes(this.status);
  next();
});

module.exports = mongoose.model('InvoiceArchiveJob', invoiceArchiveJobSchema);
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
