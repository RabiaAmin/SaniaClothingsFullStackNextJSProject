const mongoose = require('mongoose');
const Invoice = require('../models/invoice.model');

function statementError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeInvoiceIds(invoiceIds) {
  if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
    throw statementError(400, 'Select at least one invoice');
  }

  const uniqueIds = [];
  const seen = new Set();

  for (const value of invoiceIds) {
    if (typeof value !== 'string' || !mongoose.Types.ObjectId.isValid(value)) {
      throw statementError(400, 'One or more invoice IDs are invalid');
    }

    const id = new mongoose.Types.ObjectId(value);
    const normalized = id.toHexString();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueIds.push(id);
    }
  }

  return uniqueIds;
}

async function generateInvoiceStatements(invoiceIds, invoiceModel = Invoice) {
  const ids = normalizeInvoiceIds(invoiceIds);
  const selectedInvoices = await invoiceModel
    .find({ _id: { $in: ids } })
    .select('_id status')
    .lean();

  if (selectedInvoices.length !== ids.length) {
    throw statementError(404, 'One or more selected invoices no longer exist');
  }

  if (selectedInvoices.some((invoice) => invoice.status !== 'Sent')) {
    throw statementError(400, 'Statements can only include invoices with Sent status');
  }

  return invoiceModel.aggregate([
    { $match: { _id: { $in: ids }, status: 'Sent' } },
    { $sort: { date: -1, _id: -1 } },
    {
      $lookup: {
        from: 'clients',
        localField: 'toClient',
        foreignField: '_id',
        as: 'clientInfo',
      },
    },
    { $unwind: '$clientInfo' },
    {
      $group: {
        _id: '$clientInfo.name',
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        invoices: { $push: '$$ROOT' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
}

module.exports = { generateInvoiceStatements, normalizeInvoiceIds };
