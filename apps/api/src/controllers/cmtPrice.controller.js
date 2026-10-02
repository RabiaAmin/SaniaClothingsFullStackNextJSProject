const CmtPrice = require('../models/cmtPrice.model');
const asyncHandler = require('../utils/asyncHandler');
const { hasPermission } = require('../services/permission.service');
const {
  normalizeItemCode,
  parsePrice,
  getPriceByItemCode,
} = require('../services/cmtPrice.service');

function serialize(entry) {
  return typeof entry.toObject === 'function' ? entry.toObject() : entry;
}

exports.getCmtPrices = asyncHandler(async (req, res) => {
  const entries = await CmtPrice.find({}).sort({ itemCode: 1 });
  res.status(200).json({ success: true, cmtPrices: entries });
});

exports.lookupCmtPrice = asyncHandler(async (req, res) => {
  const usage = req.query.usage;
  const allowed =
    (usage === 'invoice' &&
      (hasPermission(req.user, 'invoice.create') || hasPermission(req.user, 'invoice.update'))) ||
    (usage === 'production' &&
      (hasPermission(req.user, 'production_order.create') ||
        hasPermission(req.user, 'production_order.update')));
  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to look up this price',
    });
  }
  const entry = await getPriceByItemCode(req.params.itemCode);
  const base = { itemCode: entry.itemCode, style: entry.style };
  const price =
    usage === 'invoice'
      ? { ...base, cmtPrice: entry.cmtPrice }
      : { ...base, workerPrice: entry.workerPrice };
  res.status(200).json({ success: true, price });
});

exports.createCmtPrice = asyncHandler(async (req, res) => {
  const itemCode = normalizeItemCode(req.body.itemCode);
  if (!itemCode) return res.status(400).json({ success: false, message: 'Item code is required' });
  const style = typeof req.body.style === 'string' ? req.body.style.trim() : '';
  if (!style) return res.status(400).json({ success: false, message: 'Style is required' });
  const entry = await CmtPrice.create({
    itemCode,
    style,
    cmtPrice: parsePrice(req.body.cmtPrice, 'CMT price'),
    workerPrice: parsePrice(req.body.workerPrice, 'Worker price'),
    isActive: req.body.isActive !== false,
  });
  res
    .status(201)
    .json({ success: true, message: 'CMT price created successfully', cmtPrice: entry });
});

exports.updateCmtPrice = asyncHandler(async (req, res) => {
  const entry = await CmtPrice.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: 'CMT price not found' });

  if (req.body.itemCode !== undefined) {
    const itemCode = normalizeItemCode(req.body.itemCode);
    if (!itemCode)
      return res.status(400).json({ success: false, message: 'Item code is required' });
    entry.itemCode = itemCode;
  }
  if (req.body.style !== undefined) entry.style = req.body.style;
  if (req.body.cmtPrice !== undefined) entry.cmtPrice = parsePrice(req.body.cmtPrice, 'CMT price');
  if (req.body.workerPrice !== undefined)
    entry.workerPrice = parsePrice(req.body.workerPrice, 'Worker price');
  if (req.body.isActive !== undefined) entry.isActive = req.body.isActive === true;
  await entry.save();
  res
    .status(200)
    .json({ success: true, message: 'CMT price updated successfully', cmtPrice: serialize(entry) });
});

exports.deleteCmtPrice = asyncHandler(async (req, res) => {
  const entry = await CmtPrice.findById(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: 'CMT price not found' });
  await entry.deleteOne();
  res.status(200).json({ success: true, message: 'CMT price deleted successfully' });
});
