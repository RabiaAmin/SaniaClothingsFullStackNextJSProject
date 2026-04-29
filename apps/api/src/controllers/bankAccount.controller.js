const BankAccount = require("../models/bankAccount.model");
const asyncHandler = require("../utils/asyncHandler");

exports.createBankAccount = asyncHandler(async (req, res) => {
  const { accountType, bankName, accountHolderName, accountNumber, branchCode } = req.body;

  if (!accountType || !bankName || !accountHolderName || !accountNumber) {
    return res
      .status(400)
      .json({ success: false, message: "Please provide all required fields" });
  }

  const existing = await BankAccount.findOne({ accountType });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "Bank account with this type already exists" });
  }

  const bankAccount = await BankAccount.create({
    accountType,
    bankName,
    accountHolderName,
    accountNumber,
    branchCode,
  });

  res
    .status(201)
    .json({ success: true, message: "Bank account created successfully", bankAccount });
});

exports.updateBankAccount = asyncHandler(async (req, res) => {
  const bankAccount = await BankAccount.findById(req.params.id);

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  const fields = ["bankName", "accountHolderName", "accountNumber", "branchCode"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) bankAccount[field] = req.body[field];
  });

  await bankAccount.save();

  res
    .status(200)
    .json({ success: true, message: "Bank account updated successfully", bankAccount });
});

exports.getBankAccount = asyncHandler(async (req, res) => {
  const bankAccount = await BankAccount.findById(req.params.id);

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  res.status(200).json({ success: true, bankAccount });
});

exports.deleteBankAccount = asyncHandler(async (req, res) => {
  const bankAccount = await BankAccount.findById(req.params.id);

  if (!bankAccount) {
    return res.status(404).json({ success: false, message: "Bank account not found" });
  }

  await bankAccount.deleteOne();

  res.status(200).json({ success: true, message: "Bank account deleted successfully" });
});

exports.getAllBankAccounts = asyncHandler(async (req, res) => {
  const bankAccounts = await BankAccount.find().sort({ accountType: 1 });
  res.status(200).json({ success: true, bankAccounts });
});
