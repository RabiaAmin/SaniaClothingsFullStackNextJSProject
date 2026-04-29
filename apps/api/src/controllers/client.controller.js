const Client = require("../models/client.model");
const asyncHandler = require("../utils/asyncHandler");

exports.addClient = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    phone,
    telphone,
    address,
    registrationNumber,
    vatNumber,
    fax,
    vatApplicable,
    vatRate,
  } = req.body;

  const client = await Client.create({
    name,
    email,
    phone,
    telphone,
    address,
    registrationNumber,
    vatNumber,
    fax,
    vatApplicable,
    vatRate,
  });

  res.status(201).json({ success: true, message: "Client added successfully", client });
});

exports.updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return res.status(404).json({ success: false, message: "Client not found" });
  }

  const fields = [
    "name",
    "email",
    "phone",
    "telphone",
    "address",
    "registrationNumber",
    "vatNumber",
    "fax",
    "vatApplicable",
    "vatRate",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) client[field] = req.body[field];
  });

  await client.save();

  res.status(200).json({ success: true, message: "Client updated successfully", client });
});

exports.deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return res.status(404).json({ success: false, message: "Client not found" });
  }

  await client.deleteOne();

  res.status(200).json({ success: true, message: "Client deleted successfully", client });
});

exports.getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return res.status(404).json({ success: false, message: "Client not found" });
  }

  res.status(200).json({ success: true, client });
});

exports.getAllClients = asyncHandler(async (req, res) => {
  const clients = await Client.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, clients });
});
