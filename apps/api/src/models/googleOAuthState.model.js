const mongoose = require('mongoose');

const googleOAuthStateSchema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: null },
});

module.exports = mongoose.model('GoogleOAuthState', googleOAuthStateSchema);
