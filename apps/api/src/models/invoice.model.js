const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    poNumber: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    fromBusiness: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    toClient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    items: { type: [itemSchema], required: true },
    subTotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Sent", "Paid"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
