const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  campusRole: { type: String, enum: ['student', 'faculty', 'staff'], default: 'student' },
  department: { type: String, trim: true, maxlength: 80, default: '' },
  studyYear: { type: String, enum: ['', '1', '2', '3', '4', 'postgraduate'], default: '' },
  roleTitle: { type: String, trim: true, maxlength: 80, default: '' },
  password: { type: String, required: true, select: false },
  profilePhoto: { type: String, default: '' },
  followedPosts: [{ type: String }],
  savedPosts: [{ type: String }],
  followedTopics: [{ type: String, enum: ['Study life', 'Clubs', 'Food', 'Events', 'Wellbeing', 'Campus life'] }],
  notificationPreferences: {
    status: { type: Boolean, default: true }, reply: { type: Boolean, default: true },
    comment: { type: Boolean, default: true }, topic: { type: Boolean, default: true }
  },
  isAdmin: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
