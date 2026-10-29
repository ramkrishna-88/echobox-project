const mongoose = require('mongoose');

const UserNotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  postId: { type: String, required: true },
  message: { type: String, required: true, maxlength: 300 },
  kind: { type: String, enum: ['status', 'reply', 'comment', 'topic'], required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserNotification', UserNotificationSchema);
