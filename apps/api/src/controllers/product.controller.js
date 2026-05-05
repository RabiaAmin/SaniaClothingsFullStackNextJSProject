const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");

exports.createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, images, stock, isActive } = req.body;
  const product = await Product.create({ name, description, category, images, stock, isActive });
  res.status(201).json({ success: true, message: "Product created successfully", product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  const fields = ["name", "description", "category", "images", "stock", "isActive"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });
  await product.save();
  res.status(200).json({ success: true, message: "Product updated successfully", product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  await product.deleteOne();
  res.status(200).json({ success: true, message: "Product deleted successfully", product });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.status(200).json({ success: true, product });
});

exports.getAllProducts = asyncHandler(async (req, res) => {
  const { search, category, limit, active } = req.query;

  const filter = {};
  if (active === "true") filter.isActive = true;
  if (category) filter.category = { $regex: category, $options: "i" };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  let query = Product.find(filter).sort({ createdAt: -1 });
  if (limit) query = query.limit(Number(limit));

  const products = await query;
  res.status(200).json({ success: true, products });
});
