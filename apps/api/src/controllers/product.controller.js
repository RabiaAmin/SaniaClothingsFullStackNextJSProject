const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const Product = require("../models/product.model");
const asyncHandler = require("../utils/asyncHandler");

const uploadToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "PRODUCTS", quality: "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

const uploadFiles = (files) =>
  Promise.all(
    (files || []).map(async (file) => {
      const result = await uploadToCloudinary(file.buffer);
      return { public_id: result.public_id, url: result.secure_url };
    })
  );

exports.createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, stock, isActive } = req.body;

  const images = await uploadFiles(req.files);

  const product = await Product.create({
    name,
    description,
    category: category || "",
    images,
    stock: Number(stock) || 0,
    isActive: isActive === undefined ? true : isActive === "true" || isActive === true,
  });

  res.status(201).json({ success: true, message: "Product created successfully", product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const { name, description, category, stock, isActive, existingImages } = req.body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (category !== undefined) product.category = category;
  if (stock !== undefined) product.stock = Number(stock);
  if (isActive !== undefined) product.isActive = isActive === "true" || isActive === true;

  let kept = [];
  if (existingImages) {
    try {
      kept = JSON.parse(existingImages);
    } catch (_) {
      kept = [];
    }
  }

  const newUploads = await uploadFiles(req.files);
  product.images = [...kept, ...newUploads];

  await product.save();
  res.status(200).json({ success: true, message: "Product updated successfully", product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  await Promise.all(
    product.images
      .filter((img) => img.public_id)
      .map((img) => cloudinary.uploader.destroy(img.public_id))
  );

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
