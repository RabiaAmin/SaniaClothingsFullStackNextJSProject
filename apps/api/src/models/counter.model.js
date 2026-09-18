const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    value: { type: Number, required: true, min: 0 },
  },
  { versionKey: false, collection: 'counters' }
);

module.exports = mongoose.model('Counter', counterSchema);
