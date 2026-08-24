require('./config/env');
const express = require('express');

const cookieParser = require('cookie-parser');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const errorHandler = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const businessRoutes = require('./routes/business.routes');
const clientRoutes = require('./routes/client.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const bankAccountRoutes = require('./routes/bankAccount.routes');
const productRoutes = require('./routes/product.routes');
const roleRoutes = require('./routes/role.routes');
const userManagementRoutes = require('./routes/userManagement.routes');
const productionOrderRoutes = require('./routes/productionOrder.routes');
const productionEntryRoutes = require('./routes/productionEntry.routes');
const payrollRoutes = require('./routes/payroll.routes');
const notificationRoutes = require('./routes/notification.routes');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/healthz', (req, res) => {
  res.status(200).json({ success: true, status: 'ok' });
});

app.use('/api/v1/user', authRoutes);
app.use('/api/v1/business/invoice', invoiceRoutes);
app.use('/api/v1/business', businessRoutes);
app.use('/api/v1/client', clientRoutes);
app.use('/api/v1/bankAccount', bankAccountRoutes);
app.use('/api/v1/product', productRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/users', userManagementRoutes);
app.use('/api/v1/production-orders', productionOrderRoutes);
app.use('/api/v1/production-entries', productionEntryRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/notifications', notificationRoutes);

app.use(errorHandler);

module.exports = app;
