const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const InvoiceArchiveJob = require('../models/invoiceArchiveJob.model');
const googleDrive = require('../services/googleDrive.service');
const archiveService = require('../services/invoiceArchive.service');

function publicJob(job) {
  const value = job?.toObject ? job.toObject() : { ...job };
  if (!value) return value;
  value.invoiceRecords = (value.invoiceRecords || []).map((record) => {
    const safeRecord = { ...record };
    delete safeRecord.originalDocument;
    return safeRecord;
  });
  return value;
}

exports.getDriveStatus = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json({ success: true, drive: await googleDrive.connectionStatus({ verify: true }) });
});

exports.startDriveConnection = asyncHandler(async (req, res) => {
  const authorizationUrl = await googleDrive.createAuthorizationUrl(req.user._id);
  res.status(200).json({ success: true, authorizationUrl });
});

exports.googleCallback = async (req, res, next) => {
  const frontend = (process.env.FRONTEND_URL || '').split(',')[0].replace(/\/$/, '');
  try {
    if (req.query.error)
      throw Object.assign(new Error('Google Drive authorization was declined'), {
        code: req.query.error,
      });
    if (!req.query.code) throw new Error('Google authorization code is missing');
    await googleDrive.completeAuthorization({ code: req.query.code, state: req.query.state });
    res.redirect(`${frontend}/invoices/archive?drive=connected`);
  } catch (error) {
    if (!frontend) return next(error);
    const message = encodeURIComponent(error.message || 'Google Drive connection failed');
    res.redirect(`${frontend}/invoices/archive?drive=error&message=${message}`);
  }
};

exports.disconnectDrive = asyncHandler(async (req, res) => {
  await googleDrive.disconnect();
  res.status(200).json({ success: true, message: 'Google Drive disconnected' });
});

exports.getEligibleInvoices = asyncHandler(async (req, res) => {
  const result = await archiveService.eligibilitySummary({
    page: req.query.page,
    limit: req.query.limit,
  });
  res.status(200).json({ success: true, ...result });
});

exports.createArchive = async (req, res, next) => {
  try {
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey;
    const job = await archiveService.createArchive({ userId: req.user._id, idempotencyKey });
    res.status(201).json({ success: true, job: publicJob(job) });
  } catch (error) {
    if (error.archiveJob) {
      return res.status(error.statusCode || 502).json({
        success: false,
        message: error.message,
        job: publicJob(error.archiveJob),
      });
    }
    next(error);
  }
};

exports.listJobs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const [jobs, totalRecords] = await Promise.all([
    InvoiceArchiveJob.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InvoiceArchiveJob.countDocuments(),
  ]);
  res
    .status(200)
    .json({
      success: true,
      jobs: jobs.map(publicJob),
      page,
      totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
      totalRecords,
    });
});

exports.getJob = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid archive job ID' });
  }
  const job = await InvoiceArchiveJob.findById(req.params.id).lean();
  if (!job) return res.status(404).json({ success: false, message: 'Archive job not found' });
  res.status(200).json({ success: true, job: publicJob(job) });
});

exports.confirmDeletion = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid archive job ID' });
  }
  const job = await archiveService.confirmDeletion({
    jobId: req.params.id,
    archiveId: req.body?.archiveId,
    confirmation: req.body?.confirmation,
    userId: req.user._id,
  });
  res.status(200).json({
    success: true,
    message: `${job.deletedCount} invoice records permanently deleted`,
    job: publicJob(job),
  });
});
