const mongoose = require('mongoose');
const InvoiceStatement = require('../models/invoiceStatement.model');
const asyncHandler = require('../utils/asyncHandler');
const {
  createStatementHistory,
  deleteStatementHistory,
} = require('../services/invoiceStatementHistory.service');

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

exports.createInvoiceStatement = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: 'A generated statement PDF is required' });
  }

  let invoiceIds;
  try {
    invoiceIds = JSON.parse(req.body.invoiceIds);
  } catch {
    return res.status(400).json({ success: false, message: 'Invoice IDs must be a valid array' });
  }

  const statement = await createStatementHistory({
    invoiceIds,
    pdfBuffer: req.file.buffer,
    generatedBy: req.user._id,
  });
  await statement.populate('generatedBy', 'username email');

  res.status(201).json({
    success: true,
    message: 'Statement PDF saved to history',
    statement,
  });
});

exports.getInvoiceStatements = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [statements, totalRecords] = await Promise.all([
    InvoiceStatement.find()
      .populate('generatedBy', 'username email')
      .sort({ generatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit),
    InvoiceStatement.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    statements,
    page,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    totalRecords,
  });
});

exports.getInvoiceStatement = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid statement identifier' });
  }

  const statement = await InvoiceStatement.findById(req.params.id)
    .populate('generatedBy', 'username email')
    .populate('invoiceIds', 'invoiceNumber poNumber date totalAmount');

  if (!statement) {
    return res.status(404).json({ success: false, message: 'Statement not found' });
  }

  res.status(200).json({ success: true, statement });
});

exports.deleteInvoiceStatement = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid statement identifier' });
  }

  const statement = await InvoiceStatement.findById(req.params.id);
  if (!statement) {
    return res.status(404).json({ success: false, message: 'Statement not found' });
  }

  await deleteStatementHistory(statement);
  res.status(200).json({ success: true, message: 'Statement deleted from history' });
});
