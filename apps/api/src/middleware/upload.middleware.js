const multer = require('multer');
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
      return;
    }
    callback(null, true);
  },
});

module.exports = imageUpload.array('images', 10);
module.exports.singleAvatar = imageUpload.single('avatar');
