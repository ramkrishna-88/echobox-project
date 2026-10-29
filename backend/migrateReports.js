const Post = require('./models/Post');

async function migrateLegacyReports() {
  const posts = await Post.find({ reportedBy: { $exists: true, $ne: [] } });
  let migrated = 0;
  for (const post of posts) {
    const knownReporters = new Set(post.reports.map(report => report.reporterId));
    for (const reporterId of post.reportedBy) {
      if (knownReporters.has(reporterId)) continue;
      post.reports.push({
        reporterId,
        reason: 'other',
        details: 'Legacy report; no reason was recorded.',
        status: 'pending',
        createdAt: post.createdAt || new Date()
      });
      migrated += 1;
    }
    await post.save();
  }
  return migrated;
}

module.exports = { migrateLegacyReports };
