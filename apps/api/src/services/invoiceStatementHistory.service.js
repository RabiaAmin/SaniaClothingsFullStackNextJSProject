const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const InvoiceStatement = require('../models/invoiceStatement.model');
const { generateInvoiceStatements } = require('./invoiceStatement.service');

function historyError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function statementNumberFor(id, generatedAt) {
  const date = generatedAt.toISOString().slice(0, 10).replaceAll('-', '');
  return `STMT-${date}-${id.toHexString().slice(-8).toUpperCase()}`;
}

function uploadStatementPdf(buffer, statementNumber, cloudinaryClient = cloudinary) {
  return new Promise((resolve, reject) => {
    const stream = cloudinaryClient.uploader.upload_stream(
      {
        folder: 'INVOICE_STATEMENTS',
        public_id: `${statementNumber}.pdf`,
        resource_type: 'raw',
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

async function destroyStatementPdf(publicId, cloudinaryClient = cloudinary) {
  if (!publicId) return;
  await cloudinaryClient.uploader.destroy(publicId, { resource_type: 'raw' });
}

async function createStatementHistory(
  { invoiceIds, pdfBuffer, generatedBy },
  {
    statementModel = InvoiceStatement,
    validateInvoices = generateInvoiceStatements,
    uploadPdf = uploadStatementPdf,
    destroyPdf = destroyStatementPdf,
  } = {}
) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw historyError(400, 'A generated statement PDF is required');
  }
  if (!generatedBy) throw historyError(401, 'Authenticated user is required');

  const groupedStatements = await validateInvoices(invoiceIds);
  if (groupedStatements.length !== 1) {
    throw historyError(400, 'Each saved statement PDF must contain invoices for one client');
  }

  const selectedStatement = groupedStatements[0];
  const invoices = selectedStatement.invoices ?? [];
  if (!invoices.length) throw historyError(400, 'Select at least one invoice');

  const id = new mongoose.Types.ObjectId();
  const generatedAt = new Date();
  const statementNumber = statementNumberFor(id, generatedAt);
  const dates = invoices.map((invoice) => new Date(invoice.date)).filter((date) => !isNaN(date));
  const upload = await uploadPdf(pdfBuffer, statementNumber);

  try {
    return await statementModel.create({
      _id: id,
      statementNumber,
      invoiceIds: invoices.map((invoice) => invoice._id),
      invoiceCount: invoices.length,
      clientName: selectedStatement._id,
      startDate: dates.length ? new Date(Math.min(...dates)) : null,
      endDate: dates.length ? new Date(Math.max(...dates)) : null,
      generatedBy,
      generatedAt,
      pdf: { url: upload.secure_url, publicId: upload.public_id },
    });
  } catch (error) {
    await destroyPdf(upload.public_id).catch(() => {});
    throw error;
  }
}

async function deleteStatementHistory(statement, { destroyPdf = destroyStatementPdf } = {}) {
  await destroyPdf(statement.pdf?.publicId);
  await statement.deleteOne();
}

module.exports = {
  createStatementHistory,
  deleteStatementHistory,
  destroyStatementPdf,
  statementNumberFor,
  uploadStatementPdf,
};
