const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^(\*|[a-z][a-z0-9_]*\.(\*|[a-z][a-z0-9_]*))$/, 'Invalid permission key'],
    },
    resource: { type: String, required: true, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

permissionSchema.pre('validate', function (next) {
  const expectedKey =
    this.resource === '*' && this.action === '*' ? '*' : `${this.resource}.${this.action}`;
  if (this.key !== expectedKey) {
    this.invalidate('key', 'Permission key must match its resource and action');
  }
  next();
});

module.exports = mongoose.model('Permission', permissionSchema);
