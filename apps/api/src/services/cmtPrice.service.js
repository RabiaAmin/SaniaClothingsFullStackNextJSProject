const CmtPrice = require('../models/cmtPrice.model');

class CmtPriceError extends Error {
  constructor(message, statusCode = 400, code = 'CMT_PRICE_INVALID') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeItemCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function parsePrice(value, label) {
  if (value === '' || value === null || value === undefined) {
    throw new CmtPriceError(`${label} is required`);
  }
  const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) {
    throw new CmtPriceError(`${label} must be a valid number zero or greater`);
  }
  return number;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculateInvoiceTotals(items, requestedTax = 0) {
  const taxValue = requestedTax === '' || requestedTax === null ? 0 : Number(requestedTax);
  if (!Number.isFinite(taxValue) || taxValue < 0) {
    throw new CmtPriceError('Tax must be zero or greater');
  }
  const subTotal = roundMoney(items.reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const tax = taxValue > 0 ? roundMoney(subTotal * 0.15) : 0;
  return { subTotal, tax, totalAmount: roundMoney(subTotal + tax) };
}

async function getPriceByItemCode(itemCode, options = {}) {
  const normalizedItemCode = normalizeItemCode(itemCode);
  if (!normalizedItemCode) throw new CmtPriceError('Item code is required');

  const entry = await (options.model ?? CmtPrice).findOne({ itemCode: normalizedItemCode });
  if (!entry) {
    throw new CmtPriceError('Item code not found in CMT Price List.', 400, 'CMT_PRICE_NOT_FOUND');
  }
  if (entry.isActive === false) {
    throw new CmtPriceError('This item code is currently inactive.', 400, 'CMT_PRICE_INACTIVE');
  }
  return entry;
}

function validateInvoiceQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new CmtPriceError('Invoice item quantity must be greater than zero');
  }
  return quantity;
}

async function priceNewInvoiceItems(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new CmtPriceError('At least one invoice item is required');
  }
  return Promise.all(
    items.map(async (item) => {
      const description = normalizeItemCode(item?.description);
      const price = await getPriceByItemCode(description, options);
      const quantity = validateInvoiceQuantity(item?.quantity);
      const unitPrice = Number(price.cmtPrice);
      return { description, quantity, unitPrice, amount: roundMoney(quantity * unitPrice) };
    })
  );
}

async function priceUpdatedInvoiceItems(existingItems, nextItems, options = {}) {
  if (!Array.isArray(nextItems) || nextItems.length === 0) {
    throw new CmtPriceError('At least one invoice item is required');
  }
  return Promise.all(
    nextItems.map(async (item, index) => {
      const description = normalizeItemCode(item?.description);
      if (!description) throw new CmtPriceError('Item code is required');
      const previous = existingItems?.[index];
      const unchangedCode = normalizeItemCode(previous?.description) === description;
      const unitPrice = unchangedCode
        ? Number(previous.unitPrice)
        : Number((await getPriceByItemCode(description, options)).cmtPrice);
      const quantity = validateInvoiceQuantity(item?.quantity);
      return { description, quantity, unitPrice, amount: roundMoney(quantity * unitPrice) };
    })
  );
}

module.exports = {
  CmtPriceError,
  normalizeItemCode,
  parsePrice,
  roundMoney,
  calculateInvoiceTotals,
  getPriceByItemCode,
  priceNewInvoiceItems,
  priceUpdatedInvoiceItems,
};
