const mongoose = require('mongoose');

const encryptedValueSchema = new mongoose.Schema(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
  },
  { _id: false }
);

const googleDriveConnectionSchema = new mongoose.Schema(
  {
    provider: { type: String, default: 'google-drive', unique: true, immutable: true },
    encryptedRefreshToken: { type: encryptedValueSchema, required: true, select: false },
    accountEmail: { type: String, default: '' },
    folderId: { type: String, default: '' },
    folderUrl: { type: String, default: '' },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    connectedAt: { type: Date, default: Date.now, required: true },
    lastVerifiedAt: { type: Date, default: null },
    lastError: { type: String, default: '' },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GoogleDriveConnection', googleDriveConnectionSchema);
