require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeRbac } = require('./services/rbac.service');

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    return initializeRbac();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  });
