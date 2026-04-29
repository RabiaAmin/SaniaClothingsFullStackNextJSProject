const Business = require("../models/business.model");
const asyncHandler = require("../utils/asyncHandler");

exports.createBusiness = asyncHandler(async (req, res) => {
  const { name, email, phone, telPhone, address, vatNumber, ckNumber, fax } = req.body;

  const business = await Business.create({
    name,
    email,
    phone,
    telPhone,
    address,
    vatNumber,
    ckNumber,
    fax,
  });

  res.status(201).json({ success: true, message: "Business created successfully", business });
});

exports.updateBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne();

  if (!business) {
    return res.status(404).json({ success: false, message: "Any Business not found" });
  }

  const fields = ["name", "email", "phone", "telPhone", "address", "vatNumber", "ckNumber", "fax"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) business[field] = req.body[field];
  });

  await business.save();

  res.status(200).json({ success: true, message: "Business updated successfully", business });
});

exports.getBusiness = asyncHandler(async (req, res) => {
  const business = await Business.findOne();

  if (!business) {
    return res.status(404).json({ success: false, message: "Business not found" });
  }

  res.status(200).json({ success: true, business });
});
