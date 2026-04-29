const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    telphone: { type: String, default: "" },
    address: { type: String, default: "" },
    registrationNumber: { type: String, default: "" },
    vatNumber: { type: String, default: "" },
    fax: { type: String, default: "" },
    vatApplicable: { type: Boolean, default: false },
    vatRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Client", clientSchema);
