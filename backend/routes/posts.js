const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const { authenticate, optionalAuthenticate, requireAdmin } = require('../middleware/auth');
const { POST_TOPICS, validatePost, validateReport } = require('../validation');

function serializePost(post, includeModeration = false, user = null) {
  const result = post.toObject();
  if (!includeModeration) {
    delete result.reportedBy;
    delete result.reports;
    delete result.ownerId;
  } else {
    result.reports = (result.reports || []).map(report => ({
      ...report,
      // Keep prior moderation records visible for reports reviewed before history was added.
      history: report.history?.length ? report.history : report.reviewedAt ? [{
        status: report.status,
        reviewedAt: report.reviewedAt,
        reviewedBy: report.reviewedBy || ''
      }] : []
    }));
  }
  if (result.visibility === 'anonymous') result.author = null;
  else result.author = { username: result.authorName, ...(result.visibility === 'named' ? { profilePhoto: result.authorPhoto } : {}) };
  delete result.authorName;
  delete result.authorPhoto;
  const voterId = user?._id.toString();
  result.isOwner = Boolean(user && post.ownerId === voterId);
  if (!includeModeration && !result.isOwner) delete result.resolutionFeedback;
  const pollOptions = result.poll?.options || [];
  result.poll = result.poll?.question ? {
    question: result.poll.question,
    closesAt: result.poll.closesAt || null,
    isClosed: Boolean(result.poll.closesAt && new Date(result.poll.closesAt) <= new Date()),
    options: pollOptions.map(option => ({ _id: option._id, label: option.label, votes: option.voters?.length || 0 })),
    myVote: voterId ? pollOptions.find(option => option.voters?.includes(voterId))?._id || null : null
  } : null;
  const reactionLists = result.reactions || {};
  result.reactions = Object.fromEntries(['agree', 'relate', 'helpful', 'congrats'].map(kind => [kind, reactionLists[kind]?.length || 0]));
  result.myReaction = voterId ? ['agree', 'relate', 'helpful', 'congrats'].find(kind => post.reactions?.[kind]?.includes(voterId)) || null : null;
  result.isSaved = voterId ? Boolean(user.savedPosts?.includes(post._id.toString())) : false;
  result.canEdit = Boolean(user && (user.isAdmin || post.ownerId === user._id.toString()));
  if (!result.canEdit) delete result.editHistory;
  return result;
}

// Public feed does not expose reporter identities, report reasons, or review history.
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts.map(post => serializePost(post, false, req.user)));
  } catch {
    res.status(500).json({ error: 'Could not load feedback.' });
  }
});

// Moderation data is available only to administrators.
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts.map(post => serializePost(post, true, req.user)));
  } catch {
    res.status(500).json({ error: 'Could not load moderation data.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const tag = typeof req.body.tag === 'string' ? req.body.tag.trim() : '';
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  const images = Array.isArray(req.body.images) ? req.body.images : (typeof req.body.image === 'string' && req.body.image ? [req.body.image] : []);
  const postType = req.body.postType || 'feedback';
  const topics = Array.isArray(req.body.topics) ? req.body.topics : [];
  const visibility = req.body.visibility || 'anonymous';
  const poll = req.body.poll || null;
  const validationError = validatePost(tag, content, postType, topics, visibility, poll);
  if (validationError) return res.status(400).json({ error: validationError });
  if ((req.body.images !== undefined && !Array.isArray(req.body.images)) || images.length > 5) {
    return res.status(400).json({ error: 'A feedback post can include up to 5 images.' });
  }
  const imageBytes = images.reduce((total, item) => total + (typeof item === 'string' ? item.length : 0), 0);
  if (imageBytes > 1_750_000 || images.some(item => typeof item !== 'string' || item.length > 950000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(item))) {
    return res.status(400).json({ error: 'Each image must be a resized JPEG, with no more than 5 images per post.' });
  }

  try {
    const post = await Post.create({
      tag, content, images, postType, topics, visibility,
      authorName: req.user.username,
      authorPhoto: visibility === 'named' ? req.user.profilePhoto : '',
      poll: poll ? { question: poll.question.trim(), options: poll.options.map(label => ({ label: label.trim() })), closesAt: new Date(Date.now() + ([1, 3, 7, 14].includes(Number(poll.durationDays)) ? Number(poll.durationDays) : 7) * 86400000) } : undefined,
      ownerId: req.user._id.toString(), statusHistory: ['feedback', 'idea'].includes(postType) ? [{ status: 'submitted' }] : []
    });
    if (topics.length) await notifyTopicFollowers(post, req.user._id.toString());
    res.status(201).json(serializePost(post, req.user.isAdmin, req.user));
  } catch {
    res.status(500).json({ error: 'Could not create feedback.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const tag = typeof req.body.tag === 'string' ? req.body.tag.trim() : '';
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  const postType = req.body.postType || 'feedback';
  const topics = Array.isArray(req.body.topics) ? req.body.topics : [];
  const visibility = req.body.visibility || 'anonymous';
  const validationError = validatePost(tag, content, postType, topics, visibility, null);
  if (validationError) return res.status(400).json({ error: validationError });
  const images = Array.isArray(req.body.images) ? req.body.images : [];
  if ((req.body.images !== undefined && !Array.isArray(req.body.images)) || images.length > 5) return res.status(400).json({ error: 'A feedback post can include up to 5 images.' });
  const imageBytes = images.reduce((total, image) => total + (typeof image === 'string' ? image.length : 0), 0);
  if (imageBytes > 1_750_000 || images.some(image => typeof image !== 'string' || image.length > 950000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image))) {
    return res.status(400).json({ error: 'Each image must be a resized JPEG, with no more than 5 images per post.' });
  }
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    const ownsPost = post.ownerId && post.ownerId === req.user._id.toString();
    if (!ownsPost && !req.user.isAdmin) return res.status(403).json({ error: 'You can only edit your own feedback.' });
    const changed = post.content !== content || post.tag !== tag || post.postType !== postType;
    if (changed) {
      post.editHistory.push({ tag: post.tag, content: post.content, postType: post.postType, editedAt: new Date(), editedBy: req.user.username });
      if (post.editHistory.length > 20) post.editHistory.shift();
    }
    post.tag = tag;
    post.content = content;
    post.postType = postType;
    post.topics = topics;
    if (ownsPost) {
      post.visibility = visibility;
      post.authorName = req.user.username;
      post.authorPhoto = visibility === 'named' ? req.user.profilePhoto : '';
    }
    if (req.body.images !== undefined) {
      post.images = images;
      post.image = '';
    }
    if (req.body.poll !== undefined) {
      const previousPoll = post.poll?.options || [];
      if (previousPoll.some(option => option.voters.length) && JSON.stringify(req.body.poll) !== JSON.stringify(post.poll?.toObject?.())) {
        return res.status(409).json({ error: 'A poll cannot be changed after students have voted.' });
      }
      const pollError = validatePost(tag, content, postType, topics, visibility, req.body.poll);
      if (pollError) return res.status(400).json({ error: pollError });
      post.poll = req.body.poll ? { question: req.body.poll.question.trim(), options: req.body.poll.options.map(label => ({ label: label.trim() })), closesAt: new Date(Date.now() + ([1, 3, 7, 14].includes(Number(req.body.poll.durationDays)) ? Number(req.body.poll.durationDays) : 7) * 86400000) } : undefined;
    }
    await post.save();
    res.json(serializePost(post, req.user.isAdmin, req.user));
  } catch {
    res.status(400).json({ error: 'Could not update feedback.' });
  }
});

router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  const statuses = ['submitted', 'under-review', 'planned', 'resolved'];
  if (!statuses.includes(req.body.status)) return res.status(400).json({ error: 'Choose a valid feedback status.' });
  const resolutionNote = typeof req.body.resolutionNote === 'string' ? req.body.resolutionNote.trim() : '';
  if (req.body.status === 'resolved' && (!resolutionNote || resolutionNote.length > 1000)) return res.status(400).json({ error: 'Add a resolution update between 1 and 1,000 characters.' });
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    if (!['feedback', 'idea'].includes(post.postType || 'feedback')) return res.status(409).json({ error: 'Only feedback and ideas can have progress statuses.' });
    const changed = post.status !== req.body.status;
    const resolutionChanged = req.body.status === 'resolved' && post.resolutionNote !== resolutionNote;
    const previousStatus = post.status || 'submitted';
    post.status = req.body.status;
    post.statusUpdatedAt = new Date();
    post.resolutionNote = req.body.status === 'resolved' ? resolutionNote : '';
    if (changed || resolutionChanged) {
      post.resolutionFeedback = '';
      if (!post.statusHistory.length) post.statusHistory.push({ status: previousStatus, updatedAt: post.createdAt || post.statusUpdatedAt });
      post.statusHistory.push({ status: post.status, updatedAt: post.statusUpdatedAt, note: post.status === 'resolved' ? resolutionNote : '' });
    }
    await post.save();
    if (changed || resolutionChanged) await notifyFollowers(post, 'status', `${post.postType === 'idea' ? 'Idea' : 'Feedback'} status ${resolutionChanged && !changed ? 'resolution updated' : `changed to ${req.body.status.replace('-', ' ')}`}.`);
    res.json(serializePost(post, true, req.user));
  } catch {
    res.status(400).json({ error: 'Could not update feedback status.' });
  }
});

router.put('/:id/resolution-feedback', authenticate, async (req, res) => {
  const feedback = req.body.feedback;
  if (!['resolved', 'still-open'].includes(feedback)) return res.status(400).json({ error: 'Choose whether the issue is resolved or still open.' });
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    if (post.ownerId !== req.user._id.toString()) return res.status(403).json({ error: 'Only the person who submitted this feedback can confirm its resolution.' });
    if (!['feedback', 'idea'].includes(post.postType || 'feedback') || post.status !== 'resolved') return res.status(409).json({ error: 'Resolution feedback is available after feedback or an idea is marked resolved.' });
    post.resolutionFeedback = feedback;
    await post.save();
    res.json(serializePost(post, false, req.user));
  } catch {
    res.status(400).json({ error: 'Could not save your resolution feedback.' });
  }
});

router.put('/:id/reaction', authenticate, async (req, res) => {
  const kinds = ['agree', 'relate', 'helpful', 'congrats'];
  const { kind } = req.body;
  if (!kinds.includes(kind)) return res.status(400).json({ error: 'Choose a supported reaction.' });
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const userId = req.user._id.toString();
    const alreadySelected = post.reactions[kind].includes(userId);
    for (const item of kinds) post.reactions[item] = post.reactions[item].filter(id => id !== userId);
    if (!alreadySelected) post.reactions[kind].push(userId);
    await post.save();
    res.json(serializePost(post, req.user.isAdmin, req.user));
  } catch { res.status(400).json({ error: 'Could not save your reaction.' }); }
});

router.put('/:id/poll', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post?.poll?.question) return res.status(404).json({ error: 'Poll not found.' });
    if (post.poll.closesAt && post.poll.closesAt <= new Date()) return res.status(409).json({ error: 'This poll is closed. You can still view its results.' });
    const option = post.poll.options.id(req.body.optionId);
    if (!option) return res.status(400).json({ error: 'Choose one of the poll options.' });
    const userId = req.user._id.toString();
    const previous = post.poll.options.find(item => item.voters.includes(userId));
    if (previous?._id.toString() === option._id.toString()) previous.voters.pull(userId);
    else {
      if (previous) previous.voters.pull(userId);
      option.voters.addToSet(userId);
    }
    await post.save();
    res.json(serializePost(post, req.user.isAdmin, req.user));
  } catch { res.status(400).json({ error: 'Could not save your poll vote.' }); }
});

router.put('/:id/save', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const postId = post._id.toString();
    const saved = req.user.savedPosts.includes(postId);
    req.user.savedPosts = saved ? req.user.savedPosts.filter(id => id !== postId) : [...req.user.savedPosts, postId];
    await req.user.save();
    res.json({ saved: !saved });
  } catch { res.status(400).json({ error: 'Could not update saved posts.' }); }
});

router.put('/topics/:topic/follow', authenticate, async (req, res) => {
  const topic = decodeURIComponent(req.params.topic);
  if (!POST_TOPICS.includes(topic)) return res.status(400).json({ error: 'Choose a supported topic.' });
  const following = req.user.followedTopics.includes(topic);
  req.user.followedTopics = following ? req.user.followedTopics.filter(item => item !== topic) : [...req.user.followedTopics, topic];
  await req.user.save();
  res.json({ following: !following, followedTopics: req.user.followedTopics });
});

router.post('/:id/reply', authenticate, requireAdmin, async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 1000) return res.status(400).json({ error: 'Admin reply must be between 1 and 1,000 characters.' });
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    post.adminReplies.push({ adminId: req.user._id.toString(), adminUsername: req.user.username, text });
    await post.save();
    await notifyFollowers(post, 'reply', 'An administrator replied to a post you follow.');
    res.json(serializePost(post, true, req.user));
  } catch {
    res.status(400).json({ error: 'Could not send the admin reply.' });
  }
});

router.put('/:id/follow', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    const id = post._id.toString();
    const following = req.user.followedPosts.includes(id);
    if (following) req.user.followedPosts = req.user.followedPosts.filter(postId => postId !== id);
    else req.user.followedPosts.push(id);
    await req.user.save();
    res.json({ following: !following });
  } catch {
    res.status(400).json({ error: 'Could not update followed feedback.' });
  }
});

async function notifyFollowers(post, kind, message) {
  const postId = post._id.toString();
  try {
    const followers = await User.find({ followedPosts: postId, [`notificationPreferences.${kind}`]: { $ne: false } }, '_id');
    if (followers.length) await UserNotification.insertMany(followers.map(user => ({ userId: user._id.toString(), postId, kind, message })));
  } catch (error) {
    console.error('Could not create follower notifications:', error.message);
  }
}

async function notifyTopicFollowers(post, authorId) {
  try {
    const followers = await User.find({ followedTopics: { $in: post.topics }, _id: { $ne: authorId }, 'notificationPreferences.topic': { $ne: false } }, '_id');
    if (followers.length) await UserNotification.insertMany(followers.map(user => ({
      userId: user._id.toString(), postId: post._id.toString(), kind: 'topic', message: `A new ${post.postType} was shared in ${post.topics.join(', ')}.`
    })));
  } catch (error) { console.error('Could not notify topic followers:', error.message); }
}

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Invalid feedback ID.' });
  }
});

router.put('/:id/reject-report', authenticate, requireAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });

    // Preserve old reports as review records before dismissing them.
    const knownReporters = new Set(post.reports.map(report => report.reporterId));
    for (const reporterId of post.reportedBy) {
      if (!knownReporters.has(reporterId)) {
        post.reports.push({ reporterId, reason: 'other', details: 'Legacy report; no reason was recorded.' });
      }
    }
    for (const report of post.reports) {
      if (report.status === 'pending') {
        report.status = 'rejected';
        report.reviewedAt = new Date();
        report.reviewedBy = req.user._id.toString();
        report.history.push({ status: 'rejected', reviewedAt: report.reviewedAt, reviewedBy: report.reviewedBy });
      }
    }
    post.reportedBy = [];
    await post.save();
    res.json(serializePost(post, true, req.user));
  } catch {
    res.status(400).json({ error: 'Could not reject this report.' });
  }
});

router.put('/:id/reports/:reportId/review', authenticate, requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['rejected', 'actioned'].includes(status)) return res.status(400).json({ error: 'Choose rejected or actioned.' });
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    const report = post.reports.id(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    if (report.status === 'pending') {
      report.status = status;
      report.reviewedAt = new Date();
      report.reviewedBy = req.user._id.toString();
      report.history.push({ status, reviewedAt: report.reviewedAt, reviewedBy: report.reviewedBy });
      const stillPending = post.reports.some(item => item.reporterId === report.reporterId && item.status === 'pending');
      if (!stillPending) post.reportedBy = post.reportedBy.filter(id => id !== report.reporterId);
      await post.save();
    }
    res.json(serializePost(post, true, req.user));
  } catch {
    res.status(400).json({ error: 'Could not review this report.' });
  }
});

router.put('/:id/vote', authenticate, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['up', 'down'].includes(type)) return res.status(400).json({ error: 'Vote must be up or down.' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });

    const userId = req.user._id.toString();
    const hasUpvoted = post.upvotedBy.includes(userId);
    const hasDownvoted = post.downvotedBy.includes(userId);

    if (type === 'up') {
      if (hasUpvoted) post.upvotedBy = post.upvotedBy.filter(id => id !== userId);
      else {
        post.upvotedBy.push(userId);
        post.downvotedBy = post.downvotedBy.filter(id => id !== userId);
      }
    } else if (hasDownvoted) post.downvotedBy = post.downvotedBy.filter(id => id !== userId);
    else {
      post.downvotedBy.push(userId);
      post.upvotedBy = post.upvotedBy.filter(id => id !== userId);
    }

    if (post.downvotedBy.length >= 100) {
      await Post.findByIdAndDelete(post._id);
      await Notification.create({
        message: `System Action: Feedback "${post.content.substring(0, 30)}..." was automatically taken down for reaching 100 downvotes.`
      });
      return res.json({ deleted: true, _id: post._id });
    }

    await post.save();
    res.json(serializePost(post, req.user.isAdmin, req.user));
  } catch {
    res.status(400).json({ error: 'Could not save your vote.' });
  }
});

router.put('/:id/report', authenticate, async (req, res) => {
  const { reason, details = '' } = req.body;
  const validationError = validateReport(reason, details);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });

    const reporterId = req.user._id.toString();
    const alreadyPending = post.reports.some(report => report.reporterId === reporterId && report.status === 'pending')
      || post.reportedBy.includes(reporterId);
    if (!alreadyPending) {
      post.reportedBy.addToSet(reporterId);
      post.reports.push({ reporterId, reason, details: details.trim() });
      await post.save();
    }
    res.json(serializePost(post, req.user.isAdmin, req.user));
  } catch {
    res.status(400).json({ error: 'Could not submit your report.' });
  }
});

router.post('/:id/comment', authenticate, async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 1000) return res.status(400).json({ error: 'Comment must be between 1 and 1,000 characters.' });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Feedback not found.' });
    const parentCommentId = typeof req.body.parentCommentId === 'string' ? req.body.parentCommentId : '';
    if (parentCommentId) {
      const parentComment = post.commentList.id(parentCommentId);
      if (!parentComment) return res.status(404).json({ error: 'The comment you are replying to could not be found.' });
      if (parentComment.parentCommentId) return res.status(400).json({ error: 'Replies can be one level deep.' });
    }
    post.commentList.push({ author: req.user.username, text, parentCommentId });
    await post.save();
    await notifyFollowers(post, 'comment', 'Someone commented on a post you follow.');
    res.json(serializePost(post, req.user.isAdmin, req.user));
  } catch {
    res.status(400).json({ error: 'Could not post your comment.' });
  }
});

module.exports = router;
