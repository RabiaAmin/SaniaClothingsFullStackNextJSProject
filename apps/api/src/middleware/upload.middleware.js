const multer = require("multer");

module.exports = multer({ storage: multer.memoryStorage() }).array("images", 10);
