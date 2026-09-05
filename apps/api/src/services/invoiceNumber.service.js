const Invoice = require('../models/invoice.model');

const MAX_GENERATION_ATTEMPTS = 10;

function numericInvoiceNumberPipeline() {
  return [
    {
      $project: {
        numericInvoiceNumber: {
          $convert: {
            input: '$invoiceNumber',
            to: 'double',
            onError: null,
            onNull: null,
          },
        },
      },
    },
    {
      $match: {
        $expr: {
          $and: [
            { $ne: ['$numericInvoiceNumber', null] },
            { $gte: ['$numericInvoiceNumber', 0] },
            { $eq: ['$numericInvoiceNumber', { $trunc: '$numericInvoiceNumber' }] },
          ],
        },
      },
    },
    { $sort: { numericInvoiceNumber: -1 } },
    { $limit: 1 },
  ];
}

async function generateInvoiceNumber(invoiceModel = Invoice) {
  const [latest] = await invoiceModel.aggregate(numericInvoiceNumberPipeline());
  if (!latest) return '1';

  const highest = Number(latest.numericInvoiceNumber);
  if (!Number.isSafeInteger(highest) || highest < 0 || highest >= Number.MAX_SAFE_INTEGER) {
    throw new Error('Existing invoice number is outside the supported numeric range');
  }

  return String(highest + 1);
}

function isInvoiceNumberDuplicate(error) {
  if (error?.code !== 11000) return false;

  return Boolean(
    error.keyPattern?.invoiceNumber ||
    Object.prototype.hasOwnProperty.call(error.keyValue ?? {}, 'invoiceNumber') ||
    /invoiceNumber/i.test(error.message ?? '')
  );
}

async function createInvoiceWithGeneratedNumber(invoiceData, invoiceModel = Invoice) {
  const serverControlledData = { ...invoiceData };
  delete serverControlledData.invoiceNumber;
  delete serverControlledData.invNo;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const invoiceNumber = await generateInvoiceNumber(invoiceModel);

    try {
      return await invoiceModel.create({ ...serverControlledData, invoiceNumber });
    } catch (error) {
      if (!isInvoiceNumberDuplicate(error) || attempt === MAX_GENERATION_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error('Unable to generate a unique invoice number');
}

module.exports = {
  MAX_GENERATION_ATTEMPTS,
  numericInvoiceNumberPipeline,
  generateInvoiceNumber,
  createInvoiceWithGeneratedNumber,
  isInvoiceNumberDuplicate,
};
