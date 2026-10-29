import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';
import './Admin.css';

const categories = ['Student Life', 'Teacher', 'Event', 'Facility'];
const reasons = ['spam', 'harassment', 'personal-information', 'misinformation', 'other'];
const statuses = ['submitted', 'under-review', 'planned', 'resolved'];

function FeedbackAdminTools({ post, onUpdateStatus, onAdminReply }) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [resolutionNote, setResolutionNote] = useState(post.resolutionNote || '');
  const [showResolution, setShowResolution] = useState(false);
  const submit = async event => {
    event.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    const success = await onAdminReply(post._id, reply.trim());
    if (success) setReply('');
    setBusy(false);
  };
  return <div className="admin-post-tools">
    {['feedback', 'idea'].includes(post.postType || 'feedback') && <><label>Status<select aria-label={`Update status for feedback ${post._id.slice(-4)}`} value={post.status || 'submitted'} onChange={event => { if (event.target.value === 'resolved') setShowResolution(true); else { setShowResolution(false); onUpdateStatus(post._id, event.target.value); } }}>{statuses.map(status => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}</select></label>{showResolution && <form className="resolution-update-form" onSubmit={async event => { event.preventDefault(); if (!resolutionNote.trim()) return; setBusy(true); const done = await onUpdateStatus(post._id, 'resolved', resolutionNote); setBusy(false); if (done) setShowResolution(false); }}><label>Share the resolution update<textarea value={resolutionNote} onChange={event => setResolutionNote(event.target.value)} maxLength={1000} required placeholder="Tell students what changed or what was fixed." /></label><button type="submit" disabled={busy || !resolutionNote.trim()}>{busy ? 'Saving...' : 'Publish resolution'}</button></form>}</>}
    <details><summary>Reply as admin</summary><form onSubmit={submit}><textarea aria-label="Admin reply" maxLength={1000} value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a public update..." required /><button disabled={busy || !reply.trim()}>{busy ? 'Sending...' : 'Send reply'}</button></form></details>
  </div>;
}

export default function Admin({ posts, users, onDeletePost, onReviewReport, onUpdateStatus, onAdminReply, onEditPost, postsLoading, postsError, onRetry }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionFailed, setActionFailed] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [reportStatus, setReportStatus] = useState('pending');
  const [reportReason, setReportReason] = useState('all');
  const [search, setSearch] = useState('');
  const [postSearch, setPostSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [queueView, setQueueView] = useState('pending');
  const [selectedReportKeys, setSelectedReportKeys] = useState([]);
  const [reviewBusy, setReviewBusy] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setNotifications(res.data);
      setNotificationsError('');
    } catch (err) {
      setNotificationsError(err.response?.data?.error || 'Could not load system notifications.');
    } finally { setNotificationsLoading(false); }
  };
  useEffect(() => { fetchNotifications(); }, []);

  const allReports = useMemo(() => posts.flatMap(post => (post.reports || []).map(report => ({ ...report, post }))), [posts]);
  const filteredReports = allReports.filter(report => {
    const matchesStatus = reportStatus === 'all' || report.status === reportStatus;
    const matchesReason = reportReason === 'all' || report.reason === reportReason;
    const commentContext = (report.post.commentList || []).map(comment => `${comment.author} ${comment.text}`).join(' ');
    const haystack = `${report.post.content} ${report.post.tag} ${report.details || ''} ${commentContext}`.toLowerCase();
    return matchesStatus && matchesReason && haystack.includes(search.toLowerCase());
  });
  const filteredPosts = posts.filter(post =>
    (category === 'all' || post.tag === category) && `${post.content} ${post.tag}`.toLowerCase().includes(postSearch.toLowerCase())
  );
  const totalUsers = users?.length || 0;
  const pendingReports = allReports.filter(report => report.status === 'pending').length;
  const openFeedback = posts.filter(post => ['feedback', 'idea'].includes(post.postType || 'feedback') && post.status !== 'resolved').length;
  const resolvedFeedback = posts.filter(post => ['feedback', 'idea'].includes(post.postType || 'feedback') && post.status === 'resolved').length;
  const categoryCounts = posts.reduce((acc, post) => ({ ...acc, [post.tag]: (acc[post.tag] || 0) + 1 }), {});
  const mostActiveCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  const trend = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    const count = posts.filter(post => {
      const created = new Date(post.createdAt);
      return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
    }).length;
    return { label: date.toLocaleDateString(undefined, { month: 'short' }), count };
  }), [posts]);
  const maxTrend = Math.max(1, ...trend.map(item => item.count));
  const unresolvedPosts = posts.filter(post => ['feedback', 'idea'].includes(post.postType || 'feedback') && post.status !== 'resolved' && `${post.content} ${post.tag}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recentlyResolvedPosts = posts.filter(post => ['feedback', 'idea'].includes(post.postType || 'feedback') && post.status === 'resolved' && `${post.content} ${post.tag}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => new Date(b.statusUpdatedAt || b.updatedAt) - new Date(a.statusUpdatedAt || a.updatedAt));
  const reportsForView = queueView === 'pending' ? filteredReports.filter(report => report.status === 'pending') : filteredReports;
  const selectableReports = reportsForView.filter(report => report.status === 'pending');
  const reportKey = report => `${report.post._id}:${report._id}`;
  const selectedVisibleReportCount = selectableReports.filter(report => selectedReportKeys.includes(reportKey(report))).length;

  const reviewSelected = status => {
    const selected = selectableReports.filter(report => selectedReportKeys.includes(reportKey(report)));
    if (!selected.length) return;
    setConfirmation({
      title: `${status === 'rejected' ? 'Reject' : 'Mark actioned'} ${selected.length} reports?`,
      message: `This will record the same moderation outcome for ${selected.length} selected reports. The reported posts will remain available.`,
      confirmLabel: status === 'rejected' ? 'Reject selected' : 'Mark selected actioned',
      variant: status === 'rejected' ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmation(null);
        setReviewBusy(true);
        let completed = 0;
        for (const report of selected) {
          if (await onReviewReport(report.post._id, report._id, status)) completed += 1;
        }
        setSelectedReportKeys([]);
        setReviewBusy(false);
        setActionFailed(completed !== selected.length);
        setActionMessage(`${completed} of ${selected.length} reports ${status}.`);
      }
    });
  };

  const review = (report, status) => setConfirmation({
    title: status === 'rejected' ? 'Reject this report?' : 'Mark report as actioned?',
    message: status === 'rejected' ? 'This report will be recorded as reviewed. The feedback stays available.' : 'Record that this report has been actioned. The feedback stays available.',
    confirmLabel: status === 'rejected' ? 'Reject report' : 'Mark actioned',
    variant: 'primary',
    onConfirm: async () => {
      setConfirmation(null);
      const succeeded = await onReviewReport(report.post._id, report._id, status);
      if (succeeded) setSelectedReportKeys(current => current.filter(key => key !== reportKey(report)));
      setActionFailed(!succeeded);
      setActionMessage(succeeded ? `Report ${status}.` : 'Could not update the report. Please try again.');
    }
  });

  return <div className="admin-dashboard" id="primary-content" tabIndex={-1}>
    <div className="admin-header"><div><span className="admin-eyebrow">ECHOBOX | CONTROL CENTER</span><h1>Moderation dashboard</h1><p>Review reports, track campus issues, and keep the community healthy.</p></div><span className="admin-access-badge"><i /> Admin access</span></div>
    <div className="admin-stats">
      <div className="stat-card stat-reports"><span className="stat-icon"><Icon name="flag" size={18} /></span><div><h4>Pending reports</h4><span className="stat-value">{pendingReports}</span></div><small>Needs review</small></div>
      <div className="stat-card stat-open"><span className="stat-icon"><Icon name="category" size={18} /></span><div><h4>Open feedback</h4><span className="stat-value">{openFeedback}</span></div><small>Awaiting resolution</small></div>
      <div className="stat-card stat-posts"><span className="stat-icon"><Icon name="message" size={18} /></span><div><h4>Community posts</h4><span className="stat-value">{posts.length}</span></div><small>{totalUsers} registered users</small></div>
      <div className="stat-card stat-resolved"><span className="stat-icon"><Icon name="impact" size={18} /></span><div><h4>Resolved</h4><span className="stat-value">{resolvedFeedback}</span></div><small>Feedback and ideas</small></div>
    </div>

    <div className="admin-overview-grid">
    <section className="trend-card" aria-label="Post activity over the last six months">
      <h2>Post activity</h2><p>New posts by month</p>
      <div className="trend-bars">{trend.map(item => <div className="trend-column" key={item.label}>
        <span>{item.count}</span><div className="trend-track"><i style={{ height: `${Math.max(item.count ? 8 : 0, item.count / maxTrend * 100)}%` }} /></div><small>{item.label}</small>
      </div>)}</div>
    </section>
    <section className="admin-insight-card"><span className="admin-eyebrow">COMMUNITY SNAPSHOT</span><h2>{mostActiveCategory}</h2><p>Most active category</p><div className="insight-divider"/><div className="insight-row"><span>Posts this month</span><strong>{trend.at(-1)?.count || 0}</strong></div><div className="insight-row"><span>Reports in queue</span><strong>{pendingReports}</strong></div><a href="#report-queue">Review moderation queue <span aria-hidden="true">→</span></a></section>
    </div>

    {postsError && <div className="admin-notifications-error" role="alert">{postsError} <button onClick={onRetry}>Retry</button></div>}
    <section className="admin-section" id="report-queue">
      <div className="admin-section-heading"><div><span className="admin-eyebrow">KEEP THE COMMUNITY HEALTHY</span><h2>Report review queue</h2><p>Review reports and record the moderation outcome.</p></div><span className="queue-count">{pendingReports} pending</span></div>
      <div className="admin-queue-views" role="tablist" aria-label="Saved moderation views">
        {[[ 'pending', 'Pending reports', pendingReports ], [ 'unresolved', 'Unresolved feedback', unresolvedPosts.length ], [ 'resolved', 'Recently resolved', recentlyResolvedPosts.length ], [ 'all', 'All reports', allReports.length ]].map(([view, label, count]) => <button key={view} type="button" role="tab" aria-selected={queueView === view} className={queueView === view ? 'active' : ''} onClick={() => { setQueueView(view); setSelectedReportKeys([]); if (view === 'pending') setReportStatus('pending'); if (view === 'all') setReportStatus('all'); }}>{label}<span>{count}</span></button>)}
      </div>
      {['pending', 'all'].includes(queueView) && <div className="bulk-review-toolbar">
        <label><input type="checkbox" checked={selectableReports.length > 0 && selectableReports.every(report => selectedReportKeys.includes(reportKey(report)))} onChange={event => setSelectedReportKeys(event.target.checked ? selectableReports.map(reportKey) : [])} /> Select all pending shown</label>
        {selectedVisibleReportCount > 0 && <><span>{selectedVisibleReportCount} selected</span><button type="button" className="bulk-reject" disabled={reviewBusy} onClick={() => reviewSelected('rejected')}>Reject selected</button><button type="button" className="bulk-actioned" disabled={reviewBusy} onClick={() => reviewSelected('actioned')}>Mark actioned</button></>}
      </div>}
      <div className="admin-filters">
        <input aria-label="Search moderation items" placeholder={queueView === 'unresolved' || queueView === 'resolved' ? 'Search feedback...' : 'Search reports...'} value={search} onChange={event => setSearch(event.target.value)} />
        {['pending', 'all'].includes(queueView) && <><select aria-label="Filter reports by status" value={reportStatus} onChange={event => setReportStatus(event.target.value)}><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="actioned">Actioned</option><option value="all">All statuses</option></select>
        <select aria-label="Filter reports by reason" value={reportReason} onChange={event => setReportReason(event.target.value)}><option value="all">All reasons</option>{reasons.map(reason => <option key={reason} value={reason}>{reason.replaceAll('-', ' ')}</option>)}</select></>}
      </div>
      <div className="report-queue">
        {['pending', 'all'].includes(queueView) && (postsLoading ? <div className="empty-state">Loading moderation data...</div> : reportsForView.length === 0 ? <div className="empty-state">No reports match this view.</div> : reportsForView.map(report => <article className={`report-card ${selectedReportKeys.includes(reportKey(report)) ? 'report-card-selected' : ''}`} key={report._id}>
          {report.status === 'pending' && <label className="report-select"><input type="checkbox" checked={selectedReportKeys.includes(reportKey(report))} onChange={event => setSelectedReportKeys(current => event.target.checked ? [...new Set([...current, reportKey(report)])] : current.filter(key => key !== reportKey(report)))} /><span>Select report</span></label>}
          <div className="report-card-top"><span className="mini-tag">{report.post.tag}</span><span className={`report-status report-status-${report.status}`}>{report.status}</span></div>
          <p className="report-post-content">{report.post.content}</p>
          <div className="report-meta"><strong>{report.reason.replaceAll('-', ' ')}</strong><time>{new Date(report.createdAt).toLocaleString()}</time></div>
          <p className="reporter-reference">Reporter ID ending {report.reporterId.slice(-4)}</p>
          {report.details && <p className="report-details"><strong>Reporter notes</strong>{report.details}</p>}
          <details className="report-context"><summary>Post context - {report.post.commentList?.length || 0} comments</summary>
            {['feedback', 'idea'].includes(report.post.postType || 'feedback') && <p className="context-status">Current status: <strong>{(report.post.status || 'submitted').replace('-', ' ')}</strong></p>}
            {report.post.commentList?.length ? <div className="report-context-comments">{report.post.commentList.slice(-3).map(comment => <p key={comment._id}><strong>@{comment.author}</strong><span>{comment.text}</span></p>)}</div> : <p className="context-empty">No comments on this post yet.</p>}
          </details>
          {report.history?.length > 0 && <details className="report-history"><summary>Moderation history - {report.history.length}</summary><ol>{report.history.map((entry, index) => <li key={`${entry.status}-${entry.reviewedAt}-${index}`}><strong>{entry.status}</strong><time>{new Date(entry.reviewedAt).toLocaleString()}</time><small>{entry.reviewedBy ? `Admin ID ending ${entry.reviewedBy.slice(-4)}` : 'Admin review'}</small></li>)}</ol></details>}
          {report.status === 'pending' && <div className="report-actions"><button className="reject-btn" onClick={() => review(report, 'rejected')}>Reject</button><button className="actioned-btn" onClick={() => review(report, 'actioned')}>Mark actioned</button></div>}
        </article>))}
        {['unresolved', 'resolved'].includes(queueView) && (postsLoading ? <div className="empty-state">Loading feedback...</div> : (queueView === 'unresolved' ? unresolvedPosts : recentlyResolvedPosts).length === 0 ? <div className="empty-state">No feedback matches this saved view.</div> : (queueView === 'unresolved' ? unresolvedPosts : recentlyResolvedPosts).map(post => {
          const openDays = Math.max(0, Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 86400000));
          return <article className="queue-post-card" key={post._id}>
            <div className="report-card-top"><span className="mini-tag">{post.tag}</span><span className={`post-status post-status-${post.status || 'submitted'}`}>{(post.status || 'submitted').replace('-', ' ')}</span></div>
            <p>{post.content}</p>
            {queueView === 'resolved' && post.resolutionNote && <div className="queue-resolution-note"><strong>Resolution</strong><p>{post.resolutionNote}</p>{post.resolutionFeedback && <span className={`queue-resolution-feedback ${post.resolutionFeedback === 'still-open' ? 'needs-attention' : ''}`}>{post.resolutionFeedback === 'resolved' ? 'Author confirmed resolved' : 'Author says it still needs attention'}</span>}</div>}
            <div className="queue-post-meta"><span>{post.commentList?.length || 0} comments</span>{queueView === 'unresolved' && <span className={`queue-age ${openDays >= 7 ? 'queue-age-overdue' : ''}`}>Open {openDays} {openDays === 1 ? 'day' : 'days'}</span>}<time>{new Date(post.statusUpdatedAt || post.updatedAt).toLocaleDateString()}</time></div>
            <a href={`#admin-post-${post._id}`}>Manage post <span aria-hidden="true">?</span></a>
          </article>;
        }))}
      </div>
    </section>

    <div className="admin-section-heading admin-notifications-heading"><div><span className="admin-eyebrow">SYSTEM ACTIVITY</span><h2>Notifications</h2><p>Recent alerts from EchoBox.</p></div></div>
    <div className="notifications-list">
      {notificationsLoading ? <p className="empty-state">Loading system notifications...</p> : notificationsError ? <div className="admin-notifications-error" role="alert">{notificationsError} <button onClick={fetchNotifications}>Retry</button></div> : notifications.length === 0 ? <p className="empty-state">No recent alerts from the system.</p> : notifications.map(note => <div key={note._id} className="notification-card"><strong>{note.message}</strong><time>{new Date(note.createdAt).toLocaleString()}</time></div>)}
    </div>

    <section className="admin-section" id="manage-posts"><div className="admin-section-heading"><div><span className="admin-eyebrow">CONTENT MANAGEMENT</span><h2>Manage posts</h2><p>Update status, reply to students, or edit and remove posts.</p></div></div>
      <div className="admin-filters"><input aria-label="Search feedback" placeholder="Search posts..." value={postSearch} onChange={event => setPostSearch(event.target.value)} /><select aria-label="Filter feedback by category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select></div>
      {actionMessage && <p className={`admin-action-message ${actionFailed ? 'admin-action-message-error' : ''}`} role="status">{actionMessage}</p>}
      <div className="admin-table-container">{postsLoading ? <div className="empty-state">Loading feedback…</div> : filteredPosts.length === 0 ? <div className="empty-state">No feedback matches these filters.</div> : <table className="admin-table"><thead><tr><th>ID</th><th>Category</th><th>Content</th><th>Engagements</th><th>Actions</th></tr></thead><tbody>{filteredPosts.map(post => <tr id={`admin-post-${post._id}`} key={post._id}><td>#{post._id.slice(-4)}</td><td><span className="mini-tag">{post.tag}</span></td><td className="table-content-preview">{post.content.length > 90 ? `${post.content.slice(0, 90)}...` : post.content}{(post.image || post.images?.length > 0) && <span className="admin-image-label"> · {post.images?.length || 1} image(s) attached</span>}</td><td>{post.upvotedBy.length} up · {post.downvotedBy.length} down</td><td><FeedbackAdminTools post={post} onUpdateStatus={onUpdateStatus} onAdminReply={onAdminReply} /><button className="edit-btn" onClick={() => onEditPost(post)}>Edit</button><button className="delete-btn" onClick={() => onDeletePost(post._id)}>Delete</button></td></tr>)}</tbody></table>}</div>
    </section>
    {confirmation && <ConfirmDialog {...confirmation} onCancel={() => setConfirmation(null)} />}
  </div>;
}
