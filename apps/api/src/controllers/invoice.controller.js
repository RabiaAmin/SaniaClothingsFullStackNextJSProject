const Invoice = require("../models/invoice.model");
const Client = require("../models/client.model");
const BankAccount = require("../models/bankAccount.model");
const BookTransaction = require("../models/bookTransaction.model");
const asyncHandler = require("../utils/asyncHandler");

const generateInvoiceNumber = async () => {
  const last = await Invoice.findOne({
    invoiceNumber: { $regex: /^INV-\d+$/ },
  }).sort({ invoiceNumber: -1 });

  if (!last) return "INV-0001";

  const lastNum = parseInt(last.invoiceNumber.replace("INV-", ""), 10);
  return `INV-${String(lastNum + 1).padStart(4, "0")}`;
};

const syncTransaction = async (invoice, previousStatus) => {
  const isNowPaid = invoice.status === "Paid";
  const wasPaid = previousStatus === "Paid";

  if (!wasPaid && isNowPaid) {
    await BookTransaction.create({
      invoice: invoice._id,
      subTotal: invoice.subTotal,
      tax: invoice.tax,
      totalAmount: invoice.totalAmount,
      date: invoice.date,
    });
  } else if (wasPaid && !isNowPaid) {
    await BookTransaction.deleteOne({ invoice: invoice._id });
  } else if (wasPaid && isNowPaid) {
    await BookTransaction.findOneAndUpdate(
      { invoice: invoice._id },
      { subTotal: invoice.subTotal, tax: invoice.tax, totalAmount: invoice.totalAmount }
    );
  }
};

exports.createInvoice = asyncHandler(async (req, res) => {
  const {
    fromBusiness,
    toClient,
    items,
    subTotal,
    totalAmount,
    category,
    date,
    invNo,
    poNumber,
    tax,
    status,
  } = req.body;

  if (!fromBusiness || !toClient || !items || !subTotal || !totalAmount || !category) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all required fields" });
  }

  const invoiceNumber = invNo || (await generateInvoiceNumber());

  const invoice = await Invoice.create({
    invoiceNumber,
    poNumber,
    date: date || Date.now(),
    fromBusiness,
    toClient,
    items,
    subTotal,
    tax: tax || 0,
    totalAmount,
    category,
    status: status || "Pending",
  });

  if (invoice.status === "Paid") {
    await BookTransaction.create({
      invoice: invoice._id,
      subTotal: invoice.subTotal,
      tax: invoice.tax,
      totalAmount: invoice.totalAmount,
      date: invoice.date,
    });
  }

  res.status(201).json({ success: true, message: "Invoice created successfully", invoice });
});

exports.updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  const previousStatus = invoice.status;

  const fields = [
    "fromBusiness",
    "toClient",
    "items",
    "subTotal",
    "tax",
    "totalAmount",
    "category",
    "date",
    "poNumber",
    "status",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) invoice[field] = req.body[field];
  });

  await invoice.save();
  await syncTransaction(invoice, previousStatus);

  res.status(200).json({ success: true, message: "Invoice updated successfully", invoice });
});

exports.deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  await BookTransaction.deleteOne({ invoice: invoice._id });
  await invoice.deleteOne();

  res.status(200).json({
    success: true,
    id: req.params.id,
    message: "Invoice deleted successfully",
  });
});

exports.getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate("fromBusiness")
    .populate("toClient");

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

  const accountType = invoice.toClient?.vatApplicable ? "VAT" : "NON_VAT";
  const bankAccount = await BankAccount.findOne({ accountType });

  res.status(200).json({ success: true, invoice, bankAccount: bankAccount || null });
});

exports.getAllInvoices = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 40;
  const skip = (page - 1) * limit;

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const startDate = req.query.startDate ? new Date(req.query.startDate) : defaultStart;
  const endDate = req.query.endDate
    ? new Date(new Date(req.query.endDate).setHours(23, 59, 59, 999))
    : defaultEnd;

  const filter = { date: { $gte: startDate, $lte: endDate } };

  if (req.query.poNumber) filter.poNumber = { $regex: req.query.poNumber, $options: "i" };
  if (req.query.toClient) filter.toClient = req.query.toClient;

  const [invoices, totalRecords, stats] = await Promise.all([
    Invoice.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Invoice.countDocuments(filter),
    Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalPaid: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] } },
          totalPending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          totalSent: { $sum: { $cond: [{ $eq: ["$status", "Sent"] }, 1, 0] } },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  if (!invoices.length) {
    return res.status(404).json({ success: false, message: "No invoices found" });
  }

  const aggregated = stats[0] || {
    totalInvoices: 0,
    totalPaid: 0,
    totalPending: 0,
    totalSent: 0,
    totalRevenue: 0,
  };

  res.status(200).json({
    success: true,
    invoices,
    page,
    totalPages: Math.ceil(totalRecords / limit),
    totalRecords,
    stats: {
      totalInvoices: aggregated.totalInvoices,
      totalPaid: aggregated.totalPaid,
      totalPending: aggregated.totalPending,
      totalSent: aggregated.totalSent,
      totalRevenue: aggregated.totalRevenue,
    },
  });
});

exports.getWeeklyStatements = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ success: false, message: "Start date and end date are required" });
  }

  const start = new Date(startDate);
  const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

  const statements = await Invoice.aggregate([
    {
      $match: {
        status: "Sent",
        date: { $gte: start, $lte: end },
      },
    },
    {
      $lookup: {
        from: "clients",
        localField: "toClient",
        foreignField: "_id",
        as: "clientInfo",
      },
    },
    { $unwind: "$clientInfo" },
    {
      $group: {
        _id: "$clientInfo.name",
        totalInvoices: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        invoices: { $push: "$$ROOT" },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  res.status(200).json({ success: true, statements });
});

exports.getOrdersPerProduct = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const filter = { status: "Pending" };

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const data = await Invoice.aggregate([
    { $match: filter },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.description",
        totalOrders: { $sum: "$items.quantity" },
        invoiceCount: { $sum: 1 },
      },
    },
    { $sort: { totalOrders: -1 } },
    {
      $project: {
        _id: 0,
        product: "$_id",
        totalOrders: 1,
        invoiceCount: 1,
      },
    },
  ]);

  if (!data.length) {
    return res.status(404).json({ success: false, message: "No data found for given range" });
  }

  res.status(200).json({ success: true, data });
});

exports.markAsPaid = asyncHandler(async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !invoiceIds.length) {
    return res.status(400).json({ success: false, message: "No invoices provided" });
  }

  const invoices = await Invoice.find({ _id: { $in: invoiceIds } });

  let transactionsCreated = 0;

  for (const invoice of invoices) {
    if (invoice.status !== "Paid") {
      invoice.status = "Paid";
      await invoice.save();

      const exists = await BookTransaction.findOne({ invoice: invoice._id });
      if (!exists) {
        await BookTransaction.create({
          invoice: invoice._id,
          subTotal: invoice.subTotal,
          tax: invoice.tax,
          totalAmount: invoice.totalAmount,
          date: invoice.date,
        });
        transactionsCreated++;
      }
    }
  }

  res.status(200).json({
    success: true,
    message: `${invoices.length} invoices marked as Paid, ${transactionsCreated} transactions created`,
  });
});
