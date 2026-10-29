const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  author: { type: String, required: true },
  text: { type: String, required: true },
  parentCommentId: { type: String, default: '' }
}, { timestamps: true });

const EditHistorySchema = new mongoose.Schema({
  tag: String, content: String, postType: String, editedAt: { type: Date, default: Date.now }, editedBy: String
}, { _id: false });

const ReportReviewSchema = new mongoose.Schema({
  status: { type: String, enum: ['rejected', 'actioned'], required: true },
  reviewedAt: { type: Date, default: Date.now },
  reviewedBy: { type: String, default: '' }
}, { _id: false });

const ReportSchema = new mongoose.Schema({
  reporterId: { type: String, required: true },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'personal-information', 'misinformation', 'other'],
    required: true
  },
  details: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'rejected', 'actioned'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  history: { type: [ReportReviewSchema], default: [] }
});

const AdminReplySchema = new mongoose.Schema({
  adminId: { type: String, required: true },
  adminUsername: { type: String, required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

const StatusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: ['submitted', 'under-review', 'planned', 'resolved'], required: true },
  updatedAt: { type: Date, default: Date.now },
  note: { type: String, default: '', maxlength: 1000 }
}, { _id: false });

const PollOptionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 100 },
  voters: [{ type: String }]
});

const PostSchema = new mongoose.Schema({
  tag: { type: String, required: true },
  content: { type: String, required: true },
  postType: { type: String, enum: ['feedback', 'idea', 'discussion', 'moment', 'poll'], default: 'feedback' },
  topics: [{ type: String, enum: ['Study life', 'Clubs', 'Food', 'Events', 'Wellbeing', 'Campus life'] }],
  visibility: { type: String, enum: ['anonymous', 'alias', 'named'], default: 'anonymous' },
  authorName: { type: String, default: '' },
  authorPhoto: { type: String, default: '' },
  poll: {
    question: { type: String, default: '', maxlength: 200 },
    options: [PollOptionSchema],
    closesAt: { type: Date, default: null }
  },
  reactions: {
    agree: [{ type: String }], relate: [{ type: String }], helpful: [{ type: String }], congrats: [{ type: String }]
  },
  ownerId: { type: String, default: '' },
  image: { type: String, default: '', maxlength: 1000000 },
  images: [{ type: String, maxlength: 950000 }],
  status: { type: String, enum: ['submitted', 'under-review', 'planned', 'resolved'], default: 'submitted' },
  statusUpdatedAt: { type: Date, default: Date.now },
  statusHistory: [StatusHistorySchema],
  resolutionNote: { type: String, default: '', maxlength: 1000 },
  resolutionFeedback: { type: String, enum: ['', 'resolved', 'still-open'], default: '' },
  editHistory: { type: [EditHistorySchema], default: [] },
  adminReplies: [AdminReplySchema],
  upvotedBy: [{ type: String }],
  downvotedBy: [{ type: String }],
  reportedBy: [{ type: String }],
  reports: [ReportSchema],
  commentList: [CommentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
