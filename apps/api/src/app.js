const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const errorHandler = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const businessRoutes = require("./routes/business.routes");
const clientRoutes = require("./routes/client.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const bankAccountRoutes = require("./routes/bankAccount.routes");
const productRoutes = require("./routes/product.routes");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/v1/user", authRoutes);
app.use("/api/v1/business/invoice", invoiceRoutes);
app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/client", clientRoutes);
app.use("/api/v1/bankAccount", bankAccountRoutes);
app.use("/api/v1/product", productRoutes);

app.use(errorHandler);

module.exports = app;
