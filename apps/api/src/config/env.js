const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
process.env.NODE_ENV = process.env.NODE_ENV || mode;

const envPath = path.resolve(__dirname, `../../.env.${mode}`);
const fallbackPath = path.resolve(__dirname, '../../.env');
const selectedPath = fs.existsSync(envPath) ? envPath : fallbackPath;

dotenv.config({ path: selectedPath });

if (process.env.NODE_ENV === 'production') {
  const missing = ['MONGO_URI', 'FRONTEND_URL', 'JWT_SECRET'].filter(
    (name) => !process.env[name]?.trim()
  );
  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
  if (
    process.env.JWT_SECRET.length < 32 ||
    /change-this|replace-with|secret/i.test(process.env.JWT_SECRET)
  ) {
    throw new Error('JWT_SECRET must be a non-placeholder value of at least 32 characters');
  }
}

module.exports = { mode, envPath: selectedPath };
