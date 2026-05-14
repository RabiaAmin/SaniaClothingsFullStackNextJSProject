const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const mode = process.env.NODE_ENV === "production" ? "production" : "development";
process.env.NODE_ENV = process.env.NODE_ENV || mode;

const envPath = path.resolve(__dirname, `../../.env.${mode}`);
const fallbackPath = path.resolve(__dirname, "../../.env");
const selectedPath = fs.existsSync(envPath) ? envPath : fallbackPath;

dotenv.config({ path: selectedPath });

module.exports = { mode, envPath: selectedPath };
