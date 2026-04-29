const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    telPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    vatNumber: { type: String, default: "" },
    ckNumber: { type: String, default: "" },
    fax: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Business", businessSchema);
