const Invoice = require('../models/invoice.model');
const Counter = require('../models/counter.model');

const INVOICE_COUNTER_NAME = 'invoice';
const INITIAL_INVOICE_COUNTER_VALUE = 862;

function isCounterNameDuplicate(error) {
  return Boolean(
    error?.code === 11000 &&
    (error.keyPattern?.name ||
      Object.prototype.hasOwnProperty.call(error.keyValue ?? {}, 'name') ||
      /name/i.test(error.message ?? ''))
  );
}

async function initializeInvoiceCounter(counterModel = Counter) {
  try {
    return await counterModel.findOneAndUpdate(
      { name: INVOICE_COUNTER_NAME },
      {
        $setOnInsert: {
          name: INVOICE_COUNTER_NAME,
          value: INITIAL_INVOICE_COUNTER_VALUE,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: false, runValidators: true }
    );
  } catch (error) {
    // A concurrent first request may have inserted the unique counter first.
    if (!isCounterNameDuplicate(error)) throw error;
    return counterModel.findOne({ name: INVOICE_COUNTER_NAME });
  }
}

async function generateInvoiceNumber(counterModel = Counter) {
  await initializeInvoiceCounter(counterModel);

  const counter = await counterModel.findOneAndUpdate(
    { name: INVOICE_COUNTER_NAME },
    { $inc: { value: 1 } },
    { new: true, runValidators: true }
  );

  if (!counter || !Number.isSafeInteger(counter.value) || counter.value < 1) {
    throw new Error('Invoice Counter returned an invalid value');
  }

  return String(counter.value);
}

async function createInvoiceWithGeneratedNumber(
  invoiceData,
  invoiceModel = Invoice,
  counterModel = Counter
) {
  const serverControlledData = { ...invoiceData };
  delete serverControlledData.invoiceNumber;
  delete serverControlledData.invNo;

  const invoiceNumber = await generateInvoiceNumber(counterModel);
  return invoiceModel.create({ ...serverControlledData, invoiceNumber });
}

module.exports = {
  INVOICE_COUNTER_NAME,
  INITIAL_INVOICE_COUNTER_VALUE,
  initializeInvoiceCounter,
  generateInvoiceNumber,
  createInvoiceWithGeneratedNumber,
};
