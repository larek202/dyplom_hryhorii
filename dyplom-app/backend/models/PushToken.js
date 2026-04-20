const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web', 'unknown'],
    default: 'unknown',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

pushTokenSchema.index({ token: 1 }, { unique: true });
pushTokenSchema.index({ userId: 1 });

module.exports = mongoose.model('PushToken', pushTokenSchema);









