const mongoose = require('mongoose');
const ProductionEntry = require('../models/productionEntry.model');
const ProductionOrder = require('../models/productionOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const { hasPermission } = require('../services/permission.service');
const { reviewProductionEntry } = require('../services/productionEntry.service');

const POPULATE_FIELDS = [
  {
    path: 'productionOrder',
    select:
      'poNumber productionDescription orderedQuantity approvedQuantity workerRate status client',
    populate: { path: 'client', select: 'name' },
  },
  { path: 'worker', select: 'username email' },
  { path: 'reviewedBy', select: 'username email' },
];

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function canReadAll(user) {
  return hasPermission(user, 'production_entry.read_all');
}

function canUpdateAll(user) {
  return hasPermission(user, 'production_entry.update_all');
}

async function populateEntry(entry) {
  await entry.populate(POPULATE_FIELDS);
  return entry;
}

exports.createProductionEntry = asyncHandler(async (req, res) => {
  const { productionOrderId, date, quantity, notes } = req.body;
  const parsedQuantity = parsePositiveInteger(quantity);
  const parsedDate = parseDate(date);

  if (!mongoose.isValidObjectId(productionOrderId)) {
    return res.status(400).json({ success: false, message: 'Invalid production order identifier' });
  }
  if (!parsedDate) {
    return res.status(400).json({ success: false, message: 'Please provide a valid entry date' });
  }
  if (parsedQuantity === null) {
    return res
      .status(400)
      .json({ success: false, message: 'Quantity must be a positive whole number' });
  }

  const productionOrder = await ProductionOrder.findById(productionOrderId);
  if (!productionOrder) {
    return res.status(404).json({ success: false, message: 'Production order not found' });
  }
  if (['COMPLETED', 'CANCELLED'].includes(productionOrder.status)) {
    return res
      .status(409)
      .json({ success: false, message: 'Production cannot be recorded against a closed order' });
  }
  if (parsedQuantity > productionOrder.orderedQuantity) {
    return res.status(409).json({
      success: false,
      message: 'An entry quantity cannot exceed the production order quantity',
    });
  }

  const productionEntry = await ProductionEntry.create({
    productionOrder: productionOrder._id,
    worker: req.user._id,
    date: parsedDate,
    quantity: parsedQuantity,
    unitRate: productionOrder.workerRate,
    totalAmount: parsedQuantity * productionOrder.workerRate,
    notes: typeof notes === 'string' ? notes.trim() : '',
  });
  await populateEntry(productionEntry);

  res.status(201).json({
    success: true,
    message: 'Production entry submitted for review',
    productionEntry,
  });
});

exports.getProductionEntries = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};

  if (!canReadAll(req.user)) {
    filter.worker = req.user._id;
  } else if (req.query.workerId) {
    if (!mongoose.isValidObjectId(req.query.workerId)) {
      return res.status(400).json({ success: false, message: 'Invalid worker identifier' });
    }
    filter.worker = new mongoose.Types.ObjectId(req.query.workerId);
  }
  if (req.query.productionOrderId) {
    if (!mongoose.isValidObjectId(req.query.productionOrderId)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid production order identifier' });
    }
    filter.productionOrder = new mongoose.Types.ObjectId(req.query.productionOrderId);
  }
  if (req.query.status) {
    if (!ProductionEntry.PRODUCTION_ENTRY_STATUSES.includes(req.query.status)) {
      return res.status(400).json({ success: false, message: 'Invalid production entry status' });
    }
    filter.status = req.query.status;
  }
  if (req.query.search?.trim()) {
    const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingOrders = await ProductionOrder.find({
      $or: [
        { poNumber: { $regex: escaped, $options: 'i' } },
        { productionDescription: { $regex: escaped, $options: 'i' } },
      ],
    }).distinct('_id');
    filter.productionOrder = { $in: matchingOrders };
  }
  if (req.query.dateFrom || req.query.dateTo) {
    filter.date = {};
    if (req.query.dateFrom) {
      const dateFrom = parseDate(req.query.dateFrom);
      if (!dateFrom) return res.status(400).json({ success: false, message: 'Invalid start date' });
      filter.date.$gte = dateFrom;
    }
    if (req.query.dateTo) {
      const dateTo = parseDate(req.query.dateTo);
      if (!dateTo) return res.status(400).json({ success: false, message: 'Invalid end date' });
      dateTo.setHours(23, 59, 59, 999);
      filter.date.$lte = dateTo;
    }
  }

  const [productionEntries, totalRecords, totals] = await Promise.all([
    ProductionEntry.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ProductionEntry.countDocuments(filter),
    ProductionEntry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          pendingEntries: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
          approvedQuantity: {
            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$quantity', 0] },
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$totalAmount', 0] },
          },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    productionEntries,
    stats: totals[0] ?? { pendingEntries: 0, approvedQuantity: 0, approvedAmount: 0 },
    page,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    totalRecords,
  });
});

exports.getProductionEntry = asyncHandler(async (req, res) => {
  const productionEntry = await ProductionEntry.findById(req.params.id).populate(POPULATE_FIELDS);
  if (!productionEntry) {
    return res.status(404).json({ success: false, message: 'Production entry not found' });
  }
  if (!canReadAll(req.user) && productionEntry.worker._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'You can only view your own entries' });
  }
  res.status(200).json({ success: true, productionEntry });
});

exports.updateProductionEntry = asyncHandler(async (req, res) => {
  const productionEntry = await ProductionEntry.findById(req.params.id);
  if (!productionEntry) {
    return res.status(404).json({ success: false, message: 'Production entry not found' });
  }
  if (!canUpdateAll(req.user) && productionEntry.worker.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ success: false, message: 'You can only update your own entries' });
  }
  if (productionEntry.status !== 'PENDING') {
    return res
      .status(409)
      .json({ success: false, message: 'Only pending production entries can be updated' });
  }

  if (req.body.quantity !== undefined) {
    const quantity = parsePositiveInteger(req.body.quantity);
    if (quantity === null) {
      return res
        .status(400)
        .json({ success: false, message: 'Quantity must be a positive whole number' });
    }
    const order = await ProductionOrder.findById(productionEntry.productionOrder);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Production order not found' });
    }
    if (quantity > order.orderedQuantity) {
      return res.status(409).json({
        success: false,
        message: 'An entry quantity cannot exceed the production order quantity',
      });
    }
    productionEntry.quantity = quantity;
  }
  if (req.body.date !== undefined) {
    const date = parseDate(req.body.date);
    if (!date)
      return res.status(400).json({ success: false, message: 'Please provide a valid entry date' });
    productionEntry.date = date;
  }
  if (req.body.notes !== undefined) productionEntry.notes = req.body.notes;

  await productionEntry.save();
  await populateEntry(productionEntry);
  res.status(200).json({
    success: true,
    message: 'Production entry updated successfully',
    productionEntry,
  });
});

async function review(req, res, decision) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid production entry identifier' });
  }
  const productionEntry = await reviewProductionEntry({
    entryId: req.params.id,
    reviewerId: req.user._id,
    decision,
    reviewNotes: req.body.reviewNotes,
  });
  await populateEntry(productionEntry);
  return res.status(200).json({
    success: true,
    message: `Production entry ${decision.toLowerCase()}`,
    productionEntry,
  });
}

exports.approveProductionEntry = asyncHandler((req, res) => review(req, res, 'APPROVED'));
exports.rejectProductionEntry = asyncHandler((req, res) => review(req, res, 'REJECTED'));
