const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const Invoice = require('../models/invoice.model');
const Client = require('../models/client.model');
const Business = require('../models/business.model');
const BankAccount = require('../models/bankAccount.model');
const InvoiceStatement = require('../models/invoiceStatement.model');
const InvoiceArchiveJob = require('../models/invoiceArchiveJob.model');
const driveService = require('./googleDrive.service');

const ARCHIVE_SCHEMA_VERSION = 'sania-invoice-archive/v1';

function retentionCutoff(now = new Date()) {
  const source = new Date(now);
  if (Number.isNaN(source.getTime())) throw new TypeError('A valid current date is required');
  const targetMonthIndex = source.getUTCMonth() - 6;
  const targetYear = source.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const finalDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(source.getUTCDate(), finalDay),
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds()
    )
  );
}

function eligibleFilter(cutoff) {
  return { date: { $type: 'date', $lt: cutoff } };
}

function isEligibleInvoiceDate(value, cutoff = retentionCutoff()) {
  if (value === null || value === undefined || value === '') return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime()) && date < cutoff;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    if (value instanceof Date) return JSON.stringify(value.toISOString());
    if (value._bsontype === 'ObjectId') return JSON.stringify(value.toString());
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function checksum(bufferOrValue) {
  const input = Buffer.isBuffer(bufferOrValue)
    ? bufferOrValue
    : Buffer.from(stableJson(bufferOrValue), 'utf8');
  return crypto.createHash('sha256').update(input).digest('hex');
}

function sanitizeFilename(value) {
  return (
    String(value || 'invoice')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'invoice'
  );
}

function exactInvoiceDeleteFilter(invoice) {
  const fields = [
    '__v',
    'invoiceNumber',
    'poNumber',
    'date',
    'fromBusiness',
    'toClient',
    'category',
    'items',
    'subTotal',
    'tax',
    'totalAmount',
    'status',
  ];
  return {
    _id: invoice._id,
    $and: fields.map((field) =>
      invoice[field] === undefined ? { [field]: { $exists: false } } : { [field]: invoice[field] }
    ),
  };
}

function money(value) {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function generateInvoicePdf(invoice, references = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: 42,
      info: { Title: `Invoice ${invoice.invoiceNumber}` },
    });
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    const business = references.business || {};
    const client = references.client || {};
    const bank = references.bankAccount || {};
    doc.fontSize(22).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' }).moveDown();
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice number: ${invoice.invoiceNumber || '-'}`);
    doc.text(`Invoice date: ${new Date(invoice.date).toISOString().slice(0, 10)}`);
    doc.text(`PO number: ${invoice.poNumber || '-'}`).moveDown();
    doc.font('Helvetica-Bold').text('From');
    doc
      .font('Helvetica')
      .text(business.name || '-')
      .text(business.address || '');
    if (business.vatNumber) doc.text(`VAT: ${business.vatNumber}`);
    doc.moveDown().font('Helvetica-Bold').text('Bill to');
    doc
      .font('Helvetica')
      .text(client.name || '-')
      .text(client.address || '');
    if (client.vatNumber) doc.text(`VAT: ${client.vatNumber}`);
    doc.moveDown().font('Helvetica-Bold').text('Items');
    doc.font('Helvetica');
    (invoice.items || []).forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.description || '-'} | ${Number(item.quantity || 0)} x ${money(item.unitPrice)} = ${money(item.amount)}`
      );
    });
    doc.moveDown().font('Helvetica-Bold');
    doc.text(`Subtotal: ${money(invoice.subTotal)}`, { align: 'right' });
    doc.text(`Tax: ${money(invoice.tax)}`, { align: 'right' });
    doc.text(`Total: ${money(invoice.totalAmount)}`, { align: 'right' });
    doc
      .moveDown()
      .font('Helvetica')
      .text(`Status: ${invoice.status || '-'}`);
    if (bank.bankName) {
      doc.moveDown().font('Helvetica-Bold').text('Bank details');
      doc.font('Helvetica').text(`${bank.bankName} | ${bank.accountHolderName || ''}`);
      doc.text(`Account: ${bank.accountNumber || '-'} | Branch: ${bank.branchCode || '-'}`);
    }
    doc
      .moveDown()
      .fontSize(8)
      .fillColor('gray')
      .text(
        'Related business, client, and bank details are reference snapshots resolved at archive creation time.'
      );
    doc.end();
  });
}

async function eligibilitySummary({ page = 1, limit = 50, now = new Date() } = {}) {
  const cutoff = retentionCutoff(now);
  const filter = eligibleFilter(cutoff);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const safePage = Math.max(1, Number(page) || 1);
  const [count, invoices] = await Promise.all([
    Invoice.countDocuments(filter),
    Invoice.find(filter)
      .populate('toClient', 'name')
      .sort({ date: 1, _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);
  return {
    cutoff,
    count,
    invoices,
    page: safePage,
    totalPages: Math.max(1, Math.ceil(count / safeLimit)),
  };
}

async function referenceSnapshots(invoices) {
  const businessIds = [
    ...new Set(invoices.map((item) => String(item.fromBusiness || '')).filter(Boolean)),
  ];
  const clientIds = [
    ...new Set(invoices.map((item) => String(item.toClient || '')).filter(Boolean)),
  ];
  const [businesses, clients, bankAccounts, statements] = await Promise.all([
    Business.find({ _id: { $in: businessIds } }).lean(),
    Client.find({ _id: { $in: clientIds } }).lean(),
    BankAccount.find({}).lean(),
    InvoiceStatement.find({ invoiceIds: { $in: invoices.map((item) => item._id) } }).lean(),
  ]);
  return { businesses, clients, bankAccounts, invoiceStatements: statements };
}

function byId(items) {
  return new Map(items.map((item) => [String(item._id), item]));
}

async function createArchive({ userId, idempotencyKey, now = new Date(), dependencies = {} }) {
  const models = { Invoice, InvoiceArchiveJob, ...dependencies.models };
  const drive = dependencies.driveService || driveService;
  if (idempotencyKey) {
    const existing = await models.InvoiceArchiveJob.findOne({ idempotencyKey });
    if (existing) return existing;
  }
  const cutoff = retentionCutoff(now);
  const invoices = await models.Invoice.find(eligibleFilter(cutoff))
    .sort({ date: 1, _id: 1 })
    .lean();
  if (!invoices.length) {
    const error = new Error('No invoices are currently eligible for retention cleanup');
    error.statusCode = 400;
    throw error;
  }
  const archiveId = `invoice-archive-${now.toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(5).toString('hex')}`;
  let job;
  try {
    job = await models.InvoiceArchiveJob.create({
      archiveId,
      idempotencyKey: idempotencyKey || undefined,
      status: 'PREPARING',
      retentionCutoff: cutoff,
      expectedInvoiceCount: invoices.length,
      invoiceRecords: invoices.map((invoice) => ({
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.date,
        documentChecksum: checksum(invoice),
        originalDocument: invoice,
      })),
      snapshotChecksum: checksum(invoices),
      createdBy: userId,
    });
  } catch (error) {
    if (error.code === 11000) {
      const conflict = new Error('Another invoice archive operation is already active');
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }

  try {
    const refs = dependencies.referenceSnapshots
      ? await dependencies.referenceSnapshots(invoices)
      : await referenceSnapshots(invoices);
    const businessMap = byId(refs.businesses);
    const clientMap = byId(refs.clients);
    const bankMap = new Map(refs.bankAccounts.map((account) => [account.accountType, account]));
    const archiveData = {
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      archiveId,
      createdAt: now.toISOString(),
      retentionCutoff: cutoff.toISOString(),
      note: 'Invoice documents are original MongoDB snapshots. Related records are current reference snapshots resolved at archive creation time and are not claimed as historical invoice fields.',
      invoices,
      relatedReferenceSnapshots: refs,
    };
    const jsonBuffer = Buffer.from(JSON.stringify(archiveData, null, 2));
    const generatedFiles = [];
    const pdfResults = [];
    for (const invoice of invoices) {
      const filename = `invoice-${sanitizeFilename(invoice.invoiceNumber)}-${String(invoice._id)}.pdf`;
      try {
        const client = clientMap.get(String(invoice.toClient));
        const pdf = await (dependencies.generateInvoicePdf || generateInvoicePdf)(invoice, {
          business: businessMap.get(String(invoice.fromBusiness)),
          client,
          bankAccount: bankMap.get(client?.vatApplicable ? 'VAT' : 'NON_VAT'),
        });
        generatedFiles.push({ name: filename, mimeType: 'application/pdf', buffer: pdf });
        pdfResults.push({
          invoiceId: String(invoice._id),
          filename,
          success: true,
          checksum: checksum(pdf),
          size: pdf.length,
        });
      } catch (error) {
        pdfResults.push({
          invoiceId: String(invoice._id),
          filename,
          success: false,
          error: error.message,
        });
        throw new Error(
          `PDF generation failed for invoice ${invoice.invoiceNumber}: ${error.message}`
        );
      }
    }
    const jsonFile = {
      name: `${archiveId}.json`,
      mimeType: 'application/json',
      buffer: jsonBuffer,
    };
    generatedFiles.unshift(jsonFile);
    const manifest = {
      schemaVersion: ARCHIVE_SCHEMA_VERSION,
      archiveId,
      createdAt: now.toISOString(),
      retentionCutoff: cutoff.toISOString(),
      expectedInvoiceCount: invoices.length,
      invoices: invoices.map((invoice) => ({
        id: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        date: new Date(invoice.date).toISOString(),
      })),
      json: { filename: jsonFile.name, checksum: checksum(jsonBuffer), size: jsonBuffer.length },
      pdfs: pdfResults,
    };
    const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
    generatedFiles.push({
      name: 'manifest.json',
      mimeType: 'application/json',
      buffer: manifestBuffer,
    });
    job.status = 'UPLOADING';
    await job.save();
    const { connection, drive: driveClient } = await drive.authorizedDrive();
    const folder = await drive.createArchiveFolder(driveClient, connection.folderId, archiveId);
    job.driveFolderId = folder.id;
    job.driveFolderUrl =
      folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`;
    const uploads = [];
    for (const file of generatedFiles) {
      const uploaded = await drive.uploadBuffer(driveClient, folder.id, file);
      uploads.push({
        ...file,
        driveFileId: uploaded.id,
        checksum: checksum(file.buffer),
        size: file.buffer.length,
      });
    }
    job.status = 'VERIFYING';
    await job.save();
    for (const file of uploads) {
      const downloaded = await drive.downloadBuffer(driveClient, file.driveFileId);
      if (downloaded.length !== file.size || checksum(downloaded) !== file.checksum) {
        throw new Error(`Read-back verification failed for ${file.name}`);
      }
    }
    const manifestIds = manifest.invoices.map((entry) => entry.id).sort();
    const intendedIds = invoices.map((invoice) => String(invoice._id)).sort();
    if (
      manifest.expectedInvoiceCount !== invoices.length ||
      stableJson(manifestIds) !== stableJson(intendedIds)
    ) {
      throw new Error('Manifest invoice identifiers do not match the intended snapshot');
    }
    job.files = uploads.map(({ name, mimeType, driveFileId, checksum: digest, size }) => ({
      name,
      mimeType,
      driveFileId,
      checksum: digest,
      size,
      verified: true,
    }));
    job.manifestChecksum = checksum(manifestBuffer);
    job.verification = { verifiedAt: new Date(), invoiceIdsMatched: true, allFilesMatched: true };
    job.status = 'READY_FOR_CONFIRMATION';
    await job.save();
    return job;
  } catch (error) {
    job.status = 'FAILED';
    job.error = { code: error.code || 'ARCHIVE_FAILED', message: error.message, at: new Date() };
    await job.save();
    throw Object.assign(error, { archiveJob: job });
  }
}

async function confirmDeletion({
  jobId,
  archiveId,
  confirmation,
  userId,
  now = new Date(),
  dependencies = {},
}) {
  const invoiceModel = dependencies.Invoice || Invoice;
  const jobModel = dependencies.InvoiceArchiveJob || InvoiceArchiveJob;
  if (confirmation !== 'DELETE' || !archiveId) {
    const error = new Error('Explicit deletion confirmation is required');
    error.statusCode = 400;
    throw error;
  }
  let job = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      archiveId,
      status: 'READY_FOR_CONFIRMATION',
      'verification.allFilesMatched': true,
      'verification.invoiceIdsMatched': true,
    },
    { $set: { status: 'DELETING', confirmedBy: userId, confirmedAt: now } },
    { new: true }
  );
  if (!job) {
    job = await jobModel.findOne?.({
      _id: jobId,
      archiveId,
      status: 'DELETING',
      'verification.allFilesMatched': true,
      'verification.invoiceIdsMatched': true,
    });
  }
  if (!job) {
    const error = new Error('Archive is not verified, is stale, or has already been confirmed');
    error.statusCode = 409;
    throw error;
  }
  const cutoff = retentionCutoff(now);
  let deletedCount = 0;
  const skipped = [];
  const alreadyDeleted = new Set(job.deletedInvoiceIds || []);
  for (const record of job.invoiceRecords) {
    if (alreadyDeleted.has(record.invoiceId)) continue;
    const current = await invoiceModel.findById(record.invoiceId).lean();
    if (!current) {
      skipped.push({ invoiceId: record.invoiceId, reason: 'Invoice no longer exists' });
      continue;
    }
    if (!(current.date instanceof Date) || current.date >= cutoff) {
      skipped.push({ invoiceId: record.invoiceId, reason: 'Invoice is no longer eligible' });
      continue;
    }
    if (checksum(current) !== record.documentChecksum) {
      skipped.push({
        invoiceId: record.invoiceId,
        reason: 'Invoice changed after archive snapshot',
      });
      continue;
    }
    const result = await invoiceModel.deleteOne(exactInvoiceDeleteFilter(current));
    if (result.deletedCount === 1) {
      deletedCount += 1;
      job.deletedInvoiceIds = [...(job.deletedInvoiceIds || []), record.invoiceId];
      job.deletedCount = job.deletedInvoiceIds.length;
      await job.save();
    } else skipped.push({ invoiceId: record.invoiceId, reason: 'Invoice changed during deletion' });
  }
  job.deletedCount = (job.deletedInvoiceIds || []).length || deletedCount;
  job.deletionSkipped = skipped;
  job.status = 'COMPLETED';
  job.completedAt = new Date();
  await job.save();
  return job;
}

function validateRestoreArchive(payload, existing = { ids: new Set(), numbers: new Set() }) {
  const errors = [];
  if (
    !payload ||
    payload.schemaVersion !== ARCHIVE_SCHEMA_VERSION ||
    !Array.isArray(payload.invoices)
  ) {
    return { valid: false, errors: ['Unsupported or malformed invoice archive'] };
  }
  const ids = new Set();
  const numbers = new Set();
  payload.invoices.forEach((invoice, index) => {
    const id = String(invoice?._id || '');
    const number = String(invoice?.invoiceNumber || '');
    if (!/^[a-f\d]{24}$/i.test(id)) errors.push(`Invoice ${index + 1} has an invalid identifier`);
    if (!number) errors.push(`Invoice ${index + 1} has no invoice number`);
    if (ids.has(id) || existing.ids.has(id)) errors.push(`Duplicate invoice identifier: ${id}`);
    if (numbers.has(number) || existing.numbers.has(number))
      errors.push(`Duplicate invoice number: ${number}`);
    ids.add(id);
    numbers.add(number);
  });
  return { valid: errors.length === 0, errors, invoiceCount: payload.invoices.length };
}

module.exports = {
  ARCHIVE_SCHEMA_VERSION,
  retentionCutoff,
  eligibleFilter,
  isEligibleInvoiceDate,
  checksum,
  exactInvoiceDeleteFilter,
  generateInvoicePdf,
  eligibilitySummary,
  createArchive,
  confirmDeletion,
  validateRestoreArchive,
};
