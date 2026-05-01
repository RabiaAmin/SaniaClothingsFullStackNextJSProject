const Invoice = require("../models/invoice.model");
const Client = require("../models/client.model");
const BankAccount = require("../models/bankAccount.model");
const asyncHandler = require("../utils/asyncHandler");

const generateInvoiceNumber = async () => {
  const [last] = await Invoice.aggregate([
    { $match: { invoiceNumber: { $regex: /^\d+$/ } } },
    { $addFields: { invoiceNum: { $toInt: "$invoiceNumber" } } },
    { $sort: { invoiceNum: -1 } },
    { $limit: 1 },
  ]);

  return String((last?.invoiceNum ?? 0) + 1);
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
    poNumber,
    tax,
    status,
  } = req.body;

  if (!fromBusiness || !toClient || !items || !subTotal || !totalAmount || !category) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all required fields" });
  }

  const invoiceNumber = await generateInvoiceNumber();

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

  res.status(201).json({ success: true, message: "Invoice created successfully", invoice });
});

exports.updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

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

  res.status(200).json({ success: true, message: "Invoice updated successfully", invoice });
});

exports.deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return res.status(404).json({ success: false, message: "Invoice not found" });
  }

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

exports.markAsPaid = asyncHandler(async (req, res) => {
  const { invoiceIds } = req.body;

  if (!invoiceIds || !invoiceIds.length) {
    return res.status(400).json({ success: false, message: "No invoices provided" });
  }

  const invoices = await Invoice.find({ _id: { $in: invoiceIds } });

  for (const invoice of invoices) {
    if (invoice.status !== "Paid") {
      invoice.status = "Paid";
      await invoice.save();
    }
  }

  res.status(200).json({
    success: true,
    message: `${invoices.length} invoices marked as Paid`,
  });
});
