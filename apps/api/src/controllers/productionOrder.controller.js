const ProductionOrder = require('../models/productionOrder.model');
const mongoose = require('mongoose');
const Client = require('../models/client.model');
const Product = require('../models/product.model');
const ProductionEntry = require('../models/productionEntry.model');
const asyncHandler = require('../utils/asyncHandler');
const { hasPermission } = require('../services/permission.service');
const {
  findInvoiceRelationship,
  findInvoiceRelationships,
  normalizePoNumber,
} = require('../services/productionInvoice.service');
const {
  enrichProductionOrder,
  enrichProductionOrders,
} = require('../services/productionProgress.service');
const {
  getAssignableWorkers,
  notifyAssignedWorkers,
  resolveAssignedWorkerIds,
} = require('../services/productionAssignment.service');
const { PRODUCTION_ORDER_STATUSES } = ProductionOrder;
const { escapeRegex } = require('../utils/query');

const POPULATE_FIELDS = [
  { path: 'client', select: 'name email phone' },
  { path: 'product', select: 'name description category images' },
  { path: 'assignedWorkers', select: 'username email isActive' },
  { path: 'createdBy', select: 'username email' },
  { path: 'updatedBy', select: 'username email' },
];

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function parseNonNegativeNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function isValidDate(value) {
  return value && !Number.isNaN(new Date(value).getTime());
}

function isValidStatus(value) {
  return PRODUCTION_ORDER_STATUSES.includes(value);
}

function normalizeItemCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

async function validateReferences(clientId, productId) {
  if (!mongoose.isValidObjectId(clientId) || (productId && !mongoose.isValidObjectId(productId))) {
    return { error: 'Invalid client or product identifier' };
  }
  const [client, product] = await Promise.all([
    clientId ? Client.findById(clientId) : null,
    productId ? Product.findById(productId) : null,
  ]);
  if (!client) return { error: 'Client not found' };
  if (productId && !product) return { error: 'Product not found' };
  return { client, product };
}

function canManageAssignments(req) {
  return hasPermission(req.user, 'production_order.assign');
}

async function resolveRequestedAssignments(req, assignedWorkerIds) {
  if (assignedWorkerIds === undefined) return null;
  if (!canManageAssignments(req)) {
    const error = new Error('You do not have permission to assign production orders');
    error.statusCode = 403;
    throw error;
  }
  return resolveAssignedWorkerIds(assignedWorkerIds);
}

async function sendAssignmentNotifications(payload) {
  try {
    await notifyAssignedWorkers(payload);
  } catch (notificationError) {
    console.error(
      'Failed to create production assignment notifications:',
      notificationError.message
    );
  }
}

exports.getAssignableWorkers = asyncHandler(async (req, res) => {
  const workers = await getAssignableWorkers();
  res.status(200).json({
    success: true,
    workers: workers.map(({ _id, username, email }) => ({ _id, username, email })),
  });
});

exports.createProductionOrder = asyncHandler(async (req, res) => {
  const {
    poNumber,
    itemCode,
    assignedWorkerIds,
    clientId,
    productId,
    productionDescription,
    orderedQuantity,
    workerRate,
    startDate,
    dueDate,
    status,
    notes,
  } = req.body;

  const normalizedPoNumber = normalizePoNumber(poNumber);
  const normalizedItemCode = normalizeItemCode(itemCode);
  const assignments = (await resolveRequestedAssignments(req, assignedWorkerIds)) ?? [];
  const parsedQuantity = parsePositiveInteger(orderedQuantity);
  const parsedRate = parseNonNegativeNumber(workerRate);
  if (!normalizedPoNumber || !normalizedItemCode || !clientId || !startDate || !dueDate) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }
  if (!isValidDate(startDate) || !isValidDate(dueDate) || new Date(dueDate) < new Date(startDate)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid date range' });
  }
  if (status !== undefined && !isValidStatus(status)) {
    return res.status(400).json({ success: false, message: 'Invalid production order status' });
  }
  if (parsedQuantity === null) {
    return res
      .status(400)
      .json({ success: false, message: 'Ordered quantity must be a positive whole number' });
  }
  if (parsedRate === null) {
    return res.status(400).json({ success: false, message: 'Worker rate must be zero or greater' });
  }

  const { product, error } = await validateReferences(clientId, productId);
  if (error) return res.status(400).json({ success: false, message: error });
  const description =
    typeof productionDescription === 'string'
      ? productionDescription.trim() || product?.name
      : product?.name;
  if (!description) {
    return res.status(400).json({
      success: false,
      message: 'Select a product or provide a production description',
    });
  }

  if (await ProductionOrder.exists({ poNumber: normalizedPoNumber })) {
    return res.status(409).json({ success: false, message: 'PO number already exists' });
  }

  const productionOrder = await ProductionOrder.create({
    poNumber: normalizedPoNumber,
    itemCode: normalizedItemCode,
    assignedWorkers: assignments,
    client: clientId,
    product: productId || null,
    productionDescription: description,
    orderedQuantity: parsedQuantity,
    workerRate: parsedRate,
    startDate,
    dueDate,
    status: status || 'PENDING',
    notes: notes || '',
    createdBy: req.user._id,
    updatedBy: req.user._id,
  });
  await sendAssignmentNotifications({
    workerIds: assignments,
    order: productionOrder,
    actorId: req.user._id,
  });
  await productionOrder.populate(POPULATE_FIELDS);
  const responseOrder = await enrichProductionOrder(productionOrder);

  res.status(201).json({
    success: true,
    message: 'Production order created successfully',
    productionOrder: responseOrder,
  });
});

exports.getProductionOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};

  if (req.query.search?.trim()) {
    const search = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ poNumber: search }, { itemCode: search }, { productionDescription: search }];
  }
  if (req.query.status) {
    if (!isValidStatus(req.query.status)) {
      return res.status(400).json({ success: false, message: 'Invalid production order status' });
    }
    filter.status = req.query.status;
  }
  if (req.query.clientId) {
    if (!mongoose.isValidObjectId(req.query.clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid client identifier' });
    }
    filter.client = req.query.clientId;
  }
  if (
    hasPermission(req.user, 'production_entry.read_own') &&
    !hasPermission(req.user, 'production_entry.read_all')
  ) {
    filter.$and = [
      ...(filter.$and ?? []),
      {
        $or: [
          { assignedWorkers: req.user._id },
          { assignedWorkers: { $exists: false } },
          { assignedWorkers: { $size: 0 } },
        ],
      },
    ];
  }

  let [productionOrders, totalRecords] = await Promise.all([
    ProductionOrder.find(filter)
      .populate(POPULATE_FIELDS)
      .sort({ dueDate: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ProductionOrder.countDocuments(filter),
  ]);
  productionOrders = await enrichProductionOrders(productionOrders);

  if (hasPermission(req.user, 'invoice.read') && productionOrders.length > 0) {
    const relationships = await findInvoiceRelationships(
      productionOrders.map((order) => order.poNumber)
    );
    productionOrders = productionOrders.map((order) => {
      const { invoices, ...invoiceRelationship } = relationships.get(
        normalizePoNumber(order.poNumber)
      );
      return { ...order, invoiceRelationship };
    });
  }

  res.status(200).json({
    success: true,
    productionOrders,
    page,
    totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
    totalRecords,
  });
});

exports.getProductionOrder = asyncHandler(async (req, res) => {
  const productionOrder = await ProductionOrder.findById(req.params.id).populate(POPULATE_FIELDS);
  if (!productionOrder) {
    return res.status(404).json({ success: false, message: 'Production order not found' });
  }

  const invoiceRelationship = hasPermission(req.user, 'invoice.read')
    ? await findInvoiceRelationship(productionOrder.poNumber)
    : null;
  const matchingInvoices = invoiceRelationship?.invoices ?? [];
  const responseOrder = await enrichProductionOrder(productionOrder);

  res.status(200).json({
    success: true,
    productionOrder: responseOrder,
    invoiceRelationship,
    matchingInvoices,
  });
});

exports.updateProductionOrder = asyncHandler(async (req, res) => {
  const productionOrder = await ProductionOrder.findById(req.params.id);
  if (!productionOrder) {
    return res.status(404).json({ success: false, message: 'Production order not found' });
  }
  const previousAssignedWorkerIds = (productionOrder.assignedWorkers ?? []).map(String);
  const assignments = await resolveRequestedAssignments(req, req.body.assignedWorkerIds);

  if (req.body.poNumber !== undefined) {
    const poNumber = normalizePoNumber(req.body.poNumber);
    if (!poNumber)
      return res.status(400).json({ success: false, message: 'PO number is required' });
    const duplicate = await ProductionOrder.exists({ _id: { $ne: productionOrder._id }, poNumber });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'PO number already exists' });
    }
    productionOrder.poNumber = poNumber;
  }

  if (req.body.itemCode !== undefined) {
    const itemCode = normalizeItemCode(req.body.itemCode);
    if (!itemCode) {
      return res.status(400).json({ success: false, message: 'Item code is required' });
    }
    productionOrder.itemCode = itemCode;
  }
  if (assignments !== null) productionOrder.assignedWorkers = assignments;

  const nextClientId = req.body.clientId ?? productionOrder.client;
  const nextProductId =
    req.body.productId === undefined ? productionOrder.product : req.body.productId;
  if (req.body.clientId !== undefined || req.body.productId !== undefined) {
    const { error } = await validateReferences(nextClientId, nextProductId);
    if (error) return res.status(400).json({ success: false, message: error });
    productionOrder.client = nextClientId;
    productionOrder.product = nextProductId || null;
  }

  if (req.body.productionDescription !== undefined) {
    productionOrder.productionDescription = req.body.productionDescription;
  }
  if (req.body.orderedQuantity !== undefined) {
    const quantity = parsePositiveInteger(req.body.orderedQuantity);
    if (quantity === null) {
      return res
        .status(400)
        .json({ success: false, message: 'Ordered quantity must be a positive whole number' });
    }
    if (quantity < productionOrder.approvedQuantity) {
      return res.status(409).json({
        success: false,
        message: 'Ordered quantity cannot be lower than approved production',
      });
    }
    if (
      quantity !== productionOrder.orderedQuantity &&
      (await ProductionEntry.exists({ productionOrder: productionOrder._id }))
    ) {
      return res.status(409).json({
        success: false,
        message: 'Ordered quantity cannot be changed after production entries have been submitted',
      });
    }
    productionOrder.orderedQuantity = quantity;
  }
  if (req.body.workerRate !== undefined) {
    const rate = parseNonNegativeNumber(req.body.workerRate);
    if (rate === null) {
      return res
        .status(400)
        .json({ success: false, message: 'Worker rate must be zero or greater' });
    }
    productionOrder.workerRate = rate;
  }

  ['startDate', 'dueDate', 'status', 'notes'].forEach((field) => {
    if (req.body[field] !== undefined) productionOrder[field] = req.body[field];
  });
  if (
    !isValidDate(productionOrder.startDate) ||
    !isValidDate(productionOrder.dueDate) ||
    productionOrder.dueDate < productionOrder.startDate
  ) {
    return res.status(400).json({ success: false, message: 'Please provide a valid date range' });
  }
  if (!isValidStatus(productionOrder.status)) {
    return res.status(400).json({ success: false, message: 'Invalid production order status' });
  }
  productionOrder.updatedBy = req.user._id;
  await productionOrder.save({ validateModifiedOnly: true });
  const newlyAssignedWorkerIds =
    assignments?.filter((workerId) => !previousAssignedWorkerIds.includes(String(workerId))) ?? [];
  await sendAssignmentNotifications({
    workerIds: newlyAssignedWorkerIds,
    order: productionOrder,
    actorId: req.user._id,
  });
  await productionOrder.populate(POPULATE_FIELDS);
  const responseOrder = await enrichProductionOrder(productionOrder);

  res.status(200).json({
    success: true,
    message: 'Production order updated successfully',
    productionOrder: responseOrder,
  });
});

exports.updateProductionOrderStatus = asyncHandler(async (req, res) => {
  const productionOrder = await ProductionOrder.findById(req.params.id);
  if (!productionOrder) {
    return res.status(404).json({ success: false, message: 'Production order not found' });
  }

  if (!isValidStatus(req.body.status)) {
    return res.status(400).json({ success: false, message: 'Invalid production order status' });
  }
  productionOrder.status = req.body.status;
  productionOrder.updatedBy = req.user._id;
  await productionOrder.save({ validateModifiedOnly: true });
  await productionOrder.populate(POPULATE_FIELDS);
  const responseOrder = await enrichProductionOrder(productionOrder);
  res.status(200).json({
    success: true,
    message: 'Production order status updated',
    productionOrder: responseOrder,
  });
});

exports.deleteProductionOrder = asyncHandler(async (req, res) => {
  const productionOrder = await ProductionOrder.findById(req.params.id);
  if (!productionOrder) {
    return res.status(404).json({ success: false, message: 'Production order not found' });
  }
  const hasProductionEntries = await ProductionEntry.exists({
    productionOrder: productionOrder._id,
  });
  if (productionOrder.approvedQuantity > 0 || hasProductionEntries) {
    return res.status(409).json({
      success: false,
      message: 'Orders with production history cannot be deleted; cancel the order instead',
    });
  }

  await productionOrder.deleteOne();
  res.status(200).json({ success: true, message: 'Production order deleted successfully' });
});
