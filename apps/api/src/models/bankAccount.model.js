const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: ["VAT", "NON_VAT"],
      required: true,
      unique: true,
    },
    bankName: { type: String, required: true },
    accountHolderName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    branchCode: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);
