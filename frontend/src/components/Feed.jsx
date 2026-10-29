import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import './Feed.css';

function FeedbackImageCarousel({ images, postId }) {
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => setActiveImage(index => Math.min(index, images.length - 1)), [images.length]);
  if (!images.length) return null;

  const showImage = index => setActiveImage((index + images.length) % images.length);

  return (
    <section className="post-image-carousel" aria-label={`${images.length} attached ${images.length === 1 ? 'image' : 'images'}`}>
      <img
        className="feedback-image"
        src={images[activeImage]}
        alt={`Image ${activeImage + 1} of ${images.length} attached to this campus feedback`}
        loading="lazy"
      />
      {images.length > 1 && <>
        <button className="carousel-arrow carousel-previous" type="button" onClick={() => showImage(activeImage - 1)} aria-label="Show previous image"><Icon name="chevronLeft" size={23} /></button>
        <button className="carousel-arrow carousel-next" type="button" onClick={() => showImage(activeImage + 1)} aria-label="Show next image"><Icon name="chevronRight" size={23} /></button>
        <div className="carousel-controls">
          <span className="carousel-count" aria-live="polite">{activeImage + 1} / {images.length}</span>
          <div className="carousel-indicators" role="group" aria-label="Choose an image">
            {images.map((_, index) => <button
              key={`${postId}-indicator-${index}`}
              type="button"
              className={`carousel-indicator ${activeImage === index ? 'active' : ''}`}
              onClick={() => showImage(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={activeImage === index ? 'true' : undefined}
            />)}
          </div>
        </div>
      </>}
    </section>
  );
}

const typeLabels = { feedback: 'Feedback', idea: 'Idea', discussion: 'Discussion', moment: 'Campus moment', poll: 'Poll' };
const typeIcons = { feedback: 'category', idea: 'idea', discussion: 'message', moment: 'sparkle', poll: 'poll' };
const reactions = [['agree', 'heart', 'Agree'], ['relate', 'message', 'Relate'], ['helpful', 'sparkle', 'Helpful'], ['congrats', 'trophy', 'Congrats']];
const availableTopics = ['Study life', 'Clubs', 'Food', 'Events', 'Wellbeing', 'Campus life'];
const feedbackStages = [['submitted', 'Submitted'], ['under-review', 'In review'], ['planned', 'Planned'], ['resolved', 'Resolved']];

function FeedbackProgress({ post }) {
  const activeIndex = Math.max(0, feedbackStages.findIndex(([status]) => status === (post.status || 'submitted')));
  const history = post.statusHistory?.length ? post.statusHistory : [{ status: post.status || 'submitted', updatedAt: post.createdAt }];
  const latestUpdate = post.statusUpdatedAt || history.at(-1)?.updatedAt || post.createdAt;
  return <div className="post-progress-wrap"><ol className="post-progress" aria-label={`Feedback progress: ${(post.status || 'submitted').replace('-', ' ')}`}>
    {feedbackStages.map(([status, label], index) => <li key={status} className={index < activeIndex ? 'complete' : index === activeIndex ? 'current' : ''} aria-current={index === activeIndex ? 'step' : undefined}><span className="post-progress-dot" /><span>{label}</span></li>)}
  </ol><span className="post-progress-updated">Updated {new Date(latestUpdate).toLocaleDateString()}</span></div>;
}

function WeeklyHighlight({ post }) {
  if (!post) return <section className="highlight-card highlight-empty">
    <div className="highlight-copy"><div className="highlight-badge"><Icon name="sparkle" size={15} /> THE CAMPUS CONVERSATION</div><h2>One campus. Many voices.</h2><p>Share an idea, raise an issue, or find out what your campus is thinking.</p><a className="highlight-cta" href="#feed-composer">Start a conversation <Icon name="arrowRight" size={16} /></a></div>
    <div className="highlight-art" aria-hidden="true"><span className="highlight-orbit highlight-orbit-one" /><span className="highlight-orbit highlight-orbit-two" /><span className="highlight-art-card highlight-art-card-one"><Icon name="idea" size={17} /> Ideas</span><span className="highlight-art-card highlight-art-card-two"><Icon name="message" size={17} /> Feedback</span><span className="highlight-art-center"><Icon name="sparkle" size={22} /></span></div>
  </section>;
  return <section className="highlight-card highlight-featured">
    <div className="highlight-copy"><div className="highlight-badge"><Icon name="sparkle" size={15} /> THIS WEEK IN ECHOBOX</div><h2>{post.content.length > 95 ? post.content.slice(0, 95) + '...' : post.content}</h2><div className="highlight-footer"><p><span>{typeLabels[post.postType || 'feedback']}</span><i /> <span>{post.tag}</span><i /> <span>{post.commentList?.length || 0} comments</span><i /> <span>{post.upvotedBy?.length || 0} supporters</span></p><a className="highlight-cta" href={`#post-${post._id}`}>Join the conversation <Icon name="arrowRight" size={16} /></a></div></div>
    <div className="highlight-feature-mark" aria-hidden="true"><Icon name="message" size={33} /><span>VOICE<br />MATTERS</span></div>
  </section>;
}

function Poll({ post, onVote, currentUser }) {
  if (!post.poll?.question) return null;
  const totalVotes = post.poll.options.reduce((sum, option) => sum + option.votes, 0);
  return <section className="post-poll"><h3>{post.poll.question}</h3>{post.poll.options.map(option => {
    const percent = totalVotes ? Math.round(option.votes / totalVotes * 100) : 0;
    return <button type="button" key={option._id} className={`poll-result ${post.poll.myVote === option._id ? 'selected' : ''}`} onClick={() => onVote(post._id, option._id)} disabled={!currentUser || post.poll.isClosed} aria-pressed={post.poll.myVote === option._id}>
      <span className="poll-result-fill" style={{ width: `${percent}%` }} /><span className="poll-result-label">{option.label}</span><strong>{percent}%</strong>
    </button>;
  })}<small>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} | {post.poll.isClosed ? 'Poll closed | final results' : currentUser ? 'Select an option to vote or change your vote.' : 'Sign in to vote.'}</small>{post.poll.closesAt && !post.poll.isClosed && <small>Closes {new Date(post.poll.closesAt).toLocaleDateString()}</small>}{post.poll.isClosed && <Link to={`/polls/${post._id}/results`}>View poll results</Link>}</section>;
}

export default function Feed({ posts, onUpvote, onDownvote, onReport, onAddComment, onFollow, onSave, onFollowTopic, onReaction, onPollVote, onResolutionFeedback, onEdit, onCreatePost, selectedPostType, setSelectedPostType, selectedTopic, setSelectedTopic, savedOnly, setSavedOnly, weeklyHighlight, currentUser, loading, error, onRetry, feedMode, setFeedMode, setSortMode, popularTopics = [], featuredPoll, isSavedPage = false }) {
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [pendingAction, setPendingAction] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = Number(selectedPostType !== 'all') + Number(selectedTopic !== 'all') + Number(savedOnly && !isSavedPage);

  const toggleComments = (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      setCommentText("");
      setReplyTo(null);
    }
  };

  const submitComment = async (e, postId) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || commentSubmitting) return;
    setCommentSubmitting(true);
    try {
      const succeeded = await onAddComment(postId, text, replyTo?._id || '');
      if (succeeded) {
        setCommentText('');
        setReplyTo(null);
      }
    } finally {
      setCommentSubmitting(false);
    }
  };

  const runPostAction = async (key, action) => {
    if (pendingAction) return;
    setPendingAction(key);
    try {
      await action();
    } finally {
      setPendingAction('');
    }
  };

  return (
    <main className="feed-container" id="primary-content" tabIndex={-1}>
      <div className={`feed-layout ${isSavedPage ? 'saved-feed-layout' : ''}`}>
      <div className="feed-content">
        {isSavedPage && <header className="saved-page-heading"><span className="rail-eyebrow">YOUR LIBRARY</span><h1>Saved posts</h1><p>Posts you bookmarked to come back to.</p></header>}
        {!isSavedPage && <>
        <WeeklyHighlight post={weeklyHighlight} />
        <section className="feed-composer" id="feed-composer" aria-label="Create a post">
          <div className="composer-intro"><span>YOUR CAMPUS, YOUR VOICE</span><strong>Start a conversation</strong></div>
          <div className="composer-avatar" aria-hidden="true">{currentUser?.username?.slice(0, 1).toUpperCase() || 'E'}</div>
          <button className="composer-prompt" type="button" onClick={() => onCreatePost('feedback')}>What’s happening on campus?</button>
          <div className="composer-quick-actions">
            <button type="button" onClick={() => onCreatePost('feedback')}><Icon name="category" size={15} /> Feedback</button>
            <button type="button" onClick={() => onCreatePost('idea')}><Icon name="idea" size={15} /> Idea</button>
            <button type="button" onClick={() => onCreatePost('discussion')}><Icon name="message" size={15} /> Discuss</button>
            <button type="button" onClick={() => onCreatePost('poll')}><Icon name="poll" size={15} /> Poll</button>
          </div>
        </section>
        </>}
        <div className="feed-toolbar">
          {!isSavedPage && <div className="feed-mode-tabs" role="tablist" aria-label="Choose feed">
            {[[ 'for-you', 'For you' ], [ 'latest', 'Latest' ], [ 'following', 'Following' ]].map(([mode, label]) => <button key={mode} type="button" role="tab" aria-selected={feedMode === mode} className={feedMode === mode ? 'active' : ''} onClick={() => { setFeedMode(mode); setSortMode(mode === 'for-you' ? 'top' : 'newest'); }}>{label}</button>)}
          </div>}
          <div className="feed-filter-heading">
            <span className="feed-filter-summary">{activeFilterCount ? 'Filters are active' : 'Explore campus posts'}</span>
            <button type="button" className={`feed-filter-trigger ${filtersOpen ? 'is-open' : ''}`} aria-expanded={filtersOpen} aria-controls="feed-filter-panel" onClick={() => setFiltersOpen(open => !open)}>
              <Icon name="category" size={15} />
              {filtersOpen ? 'Hide filters' : 'Filters'}
              {activeFilterCount > 0 && <span className="feed-filter-count">{activeFilterCount}</span>}
            </button>
          </div>
          <div className="feed-filter-panel" id="feed-filter-panel" hidden={!filtersOpen}>
            <section className="community-filters" aria-label="Community feed filters">
              <label>Post type<select value={selectedPostType} onChange={event => setSelectedPostType(event.target.value)}><option value="all">Everything</option><option value="feedback">Feedback</option><option value="idea">Ideas</option><option value="discussion">Discussions</option><option value="moment">Campus moments</option><option value="poll">Polls</option></select></label>
              <label>Topic<select value={selectedTopic} onChange={event => setSelectedTopic(event.target.value)}><option value="all">All topics</option>{availableTopics.map(topic => <option key={topic} value={topic}>{topic}</option>)}</select></label>
              {currentUser && !isSavedPage && <button type="button" className={savedOnly ? 'active' : ''} onClick={() => setSavedOnly(value => !value)} aria-pressed={savedOnly}><Icon name="bookmark" size={14} />{savedOnly ? 'Saved posts only' : 'Show saved only'}</button>}
              {currentUser && <label className="follow-topic-control">Follow a topic<select value="" onChange={event => { if (event.target.value) onFollowTopic(event.target.value); }}><option value="">Choose a topic</option>{availableTopics.filter(topic => !currentUser.followedTopics?.includes(topic)).map(topic => <option key={topic}>{topic}</option>)}</select></label>}
              {(selectedTopic !== 'all' || selectedPostType !== 'all' || savedOnly) && <button type="button" className="feed-clear-filters" onClick={() => { setSelectedTopic('all'); setSelectedPostType('all'); setSavedOnly(false); }}>Clear all</button>}
            </section>
            {!isSavedPage && <div className="feed-topic-shortcuts" aria-label="Popular topic shortcuts"><span>Trending</span><button type="button" className={selectedTopic === 'all' ? 'active' : ''} onClick={() => setSelectedTopic('all')}>All topics</button>{popularTopics.slice(0, 5).map(([topic, count]) => <button type="button" key={topic} className={selectedTopic === topic ? 'active' : ''} onClick={() => setSelectedTopic(selectedTopic === topic ? 'all' : topic)}>{topic}<small>{count}</small></button>)}</div>}
            {currentUser?.followedTopics?.length > 0 && <div className="followed-topic-list"><span>Following topics</span>{currentUser.followedTopics.map(topic => <button key={topic} type="button" className={selectedTopic === topic ? 'active' : ''} onClick={() => setSelectedTopic(selectedTopic === topic ? 'all' : topic)}>{topic}</button>)}</div>}
          </div>
        </div>
        {/* Feedback Posts */}
        <div className="posts-list">
          {loading ? (
            <div className="feed-loading-state" role="status" aria-live="polite">
              <span className="feed-loading-label">Loading campus posts</span>
              <div className="feed-loading-skeletons" aria-hidden="true">{[0, 1].map(item => <div className="feed-loading-card" key={item}><div className="feed-skeleton-chips"><i /><i /><i /></div><i className="feed-skeleton-line" /><i className="feed-skeleton-line feed-skeleton-line-short" /><i className="feed-skeleton-action" /></div>)}</div>
            </div>
          ) : error ? (
            <div className="feed-state feed-state-error" role="alert"><strong>We couldn’t load the feed</strong><p>{error}</p><button onClick={onRetry}>Try again</button></div>
          ) : posts.length === 0 ? (
            <div className="feed-state feed-empty-state" role="status"><span className="feed-empty-icon" aria-hidden="true"><Icon name={isSavedPage ? 'bookmark' : 'message'} size={20} /></span><strong>{isSavedPage ? 'Your saved list is empty' : 'No posts found'}</strong><p>{isSavedPage ? 'Save a post from the feed and it will appear here.' : 'Try another filter or start a conversation with your campus.'}</p>{!isSavedPage && <button type="button" onClick={() => onCreatePost('feedback')}>Create a post</button>}</div>
          ) : (
            posts.map(post => {
              const hasUpvoted = currentUser ? post.upvotedBy.includes(currentUser._id) : false;
              const hasDownvoted = currentUser ? post.downvotedBy.includes(currentUser._id) : false;
              const isFollowing = currentUser?.followedPosts?.includes(post._id) || false;
              const isExpanded = expandedPostId === post._id;
              const comments = post.commentList || [];
              const postImages = [...(post.images || []), ...(post.image && !(post.images || []).includes(post.image) ? [post.image] : [])];
              const hasStatusProgress = ['feedback', 'idea'].includes(post.postType || 'feedback') && ((post.status && post.status !== 'submitted') || (post.statusHistory?.length || 0) > 1);
              const authorLabel = post.author ? (post.visibility === 'alias' ? `@${post.author.username}` : post.author.username) : 'Anonymous';
              const avatarInitial = post.author?.username?.slice(0, 1).toUpperCase() || 'A';

              return (
              <article key={post._id} id={`post-${post._id}`} className={`post-card post-card-${post.postType || 'feedback'}`}>
                <header className="post-card-header">
                  <div className="post-meta-line">
                    <div className="post-author post-identity">
                      <span className="post-avatar" aria-hidden="true">{post.visibility === 'named' && post.author?.profilePhoto ? <img src={post.author.profilePhoto} alt="" /> : <span className="post-avatar-content">{post.author && post.visibility !== 'anonymous' ? avatarInitial : <Icon name="user" size={17} />}</span>}</span>
                      <span className="post-author-name">{authorLabel}</span>
                    </div>
                    <time className="post-time" dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                  </div>
                  <div className="post-badges"><span className="post-type-badge"><Icon name={typeIcons[post.postType || 'feedback']} size={14} />{typeLabels[post.postType || 'feedback']}</span><span className="post-tag">{post.tag}</span>{['feedback', 'idea'].includes(post.postType || 'feedback') && <span className={`post-status post-status-${post.status || 'submitted'}`}>{(post.status || 'submitted').replace('-', ' ')}</span>}</div>
                </header>
                {hasStatusProgress && <FeedbackProgress post={post} />}
                <div className={`post-body ${postImages.length ? 'post-body-with-media' : ''}`}>
                  <div className="post-copy">
                    {['feedback', 'idea'].includes(post.postType || 'feedback') && post.statusHistory?.length > 1 && <details className="post-status-history"><summary>Update history</summary><ol>{post.statusHistory.slice(-4).map((update, index) => <li key={`${update.status}-${update.updatedAt}-${index}`}><strong>{update.status.replace('-', ' ')}</strong><time>{new Date(update.updatedAt).toLocaleDateString()}</time></li>)}</ol></details>}
                    <p className="post-content">{post.content}</p>
                    {post.status === 'resolved' && post.resolutionNote && <aside className="post-resolution-update"><strong>Campus resolution update</strong><p>{post.resolutionNote}</p>{post.isOwner && !post.resolutionFeedback && <div className="resolution-checkin"><span>Did this resolve your issue?</span><div><button type="button" onClick={() => runPostAction(`${post._id}-resolution`, () => onResolutionFeedback(post._id, 'resolved'))} disabled={Boolean(pendingAction)}>Yes, resolved</button><button type="button" onClick={() => runPostAction(`${post._id}-resolution`, () => onResolutionFeedback(post._id, 'still-open'))} disabled={Boolean(pendingAction)}>Still needs attention</button></div></div>}{post.isOwner && post.resolutionFeedback && <p className="resolution-feedback-note">Your response: {post.resolutionFeedback === 'resolved' ? 'You confirmed this is resolved.' : 'You said this still needs attention.'}</p>}{currentUser?.isAdmin && post.resolutionFeedback && <p className="resolution-feedback-note">Author response: {post.resolutionFeedback === 'resolved' ? 'Confirmed resolved' : 'Still needs attention'}</p>}</aside>}
                    {post.canEdit && post.editHistory?.length > 0 && <details className="post-edit-history"><summary>Edited · view history</summary><ol>{post.editHistory.slice(-5).reverse().map((edit, index) => <li key={`${edit.editedAt}-${index}`}><time>{new Date(edit.editedAt).toLocaleString()}</time><p>{edit.content}</p></li>)}</ol></details>}
                    {post.topics?.length > 0 && <div className="post-topic-tags">{post.topics.map(topic => <button key={topic} type="button" onClick={() => setSelectedTopic(topic)}>{topic}</button>)}</div>}
                    <Poll post={post} onVote={onPollVote} currentUser={currentUser} />
                    {post.adminReplies?.length > 0 && <section className="post-updates" aria-label="Official updates"><div className="post-updates-heading"><strong>Official updates</strong><span>{post.adminReplies.length}</span></div><div className="post-updates-list">{post.adminReplies.map(reply => <article className="admin-reply" key={reply._id}><div className="admin-reply-heading"><strong>EchoBox Admin | @{reply.adminUsername}</strong><time>{new Date(reply.createdAt).toLocaleString()}</time></div><p>{reply.text}</p></article>)}</div></section>}
                  </div>
                  {postImages.length > 0 && <FeedbackImageCarousel images={postImages} postId={post._id} />}
                </div>
                
                <div className="post-metrics">
                  {['feedback', 'idea'].includes(post.postType || 'feedback') && <button 
                    className={`metric ${hasUpvoted ? 'active-vote' : ''}`} 
                    type="button"
                    onClick={() => runPostAction(`${post._id}-upvote`, () => onUpvote(post._id))}
                    disabled={Boolean(pendingAction)}
                    aria-pressed={hasUpvoted}
                    aria-label={`${hasUpvoted ? 'Remove support' : 'Support this post'}; ${post.upvotedBy.length} supporters`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={hasUpvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                    </svg>
                    {post.postType === 'idea' ? `Support ${post.upvotedBy.length}` : post.upvotedBy.length}
                  </button>}
                  {(post.postType || 'feedback') === 'feedback' && <button 
                    className={`metric ${hasDownvoted ? 'active-vote' : ''}`} 
                    type="button"
                    onClick={() => runPostAction(`${post._id}-downvote`, () => onDownvote(post._id))}
                    disabled={Boolean(pendingAction)}
                    aria-pressed={hasDownvoted}
                    aria-label={`${hasDownvoted ? 'Remove downvote' : 'Downvote'}; ${post.downvotedBy.length} downvotes`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={hasDownvoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"></path>
                    </svg>
                    {post.downvotedBy.length}
                  </button>}
                  {(post.postType || 'feedback') !== 'feedback' && <div className="post-reactions">{reactions.map(([kind, icon, label]) => <button type="button" key={kind} className={post.myReaction === kind ? 'active' : ''} onClick={() => runPostAction(`${post._id}-reaction`, () => onReaction(post._id, kind))} disabled={Boolean(pendingAction)} aria-pressed={post.myReaction === kind} aria-label={`${label}, ${post.reactions?.[kind] || 0}`} title={currentUser ? label : `Sign in to ${label.toLowerCase()}`}><Icon name={icon} size={15} /> <span>{post.reactions?.[kind] || 0}</span><span className="reaction-label">{label}</span></button>)}</div>}
                  <button type="button" className="metric" onClick={() => toggleComments(post._id)} aria-expanded={isExpanded} aria-label={`${isExpanded ? 'Hide' : 'Show'} ${comments.length} comments`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    {comments.length} Comments
                  </button>
                  <button type="button" className="metric" onClick={() => onReport(post._id)} aria-label="Report this post">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                      <line x1="4" y1="22" x2="4" y2="15"></line>
                    </svg>
                    Report
                  </button>
                  {post.canEdit && <button type="button" className="metric edit-post-action" onClick={() => onEdit(post)}><Icon name="edit" size={15} /> Edit</button>}
                  {currentUser && <button type="button" className="metric save-post-action" onClick={() => runPostAction(`${post._id}-save`, () => onSave(post._id))} disabled={Boolean(pendingAction)} aria-pressed={post.isSaved}><Icon name="bookmark" size={15} /> {post.isSaved ? 'Saved' : 'Save'}</button>}
                  <button type="button" className={`metric follow-metric ${isFollowing ? 'active-vote' : ''}`} onClick={() => runPostAction(`${post._id}-follow`, () => onFollow(post._id))} disabled={Boolean(pendingAction)} aria-pressed={isFollowing}><Icon name="bell" size={15} /> {isFollowing ? 'Following' : 'Follow updates'}</button>
                </div>
                
                {isExpanded && (
                  <div className="comments-section">
                    {comments.length === 0 ? (
                      <div className="no-comments">No comments yet. Be the first to share your thoughts!</div>
                    ) : (
                      comments.filter(c => !c.parentCommentId).map(c => <div key={c._id || c.id} className="comment-thread">
                        <div className="comment-item"><span className="comment-author">@{c.author}</span><span className="comment-text">{c.text}</span>{currentUser && <button type="button" className="comment-reply-button" onClick={() => setReplyTo(c)}>Reply</button>}</div>
                        {comments.filter(reply => reply.parentCommentId === (c._id || c.id)).map(reply => <div key={reply._id || reply.id} className="comment-item comment-reply-item"><span className="comment-author">@{reply.author}</span><span className="comment-text">{reply.text}</span></div>)}
                      </div>)
                    )}
                    {replyTo && <div className="comment-replying">Replying to @{replyTo.author}<button type="button" onClick={() => setReplyTo(null)}>Cancel reply</button></div>}
                    
                    <form className="comment-input-container" onSubmit={(e) => submitComment(e, post._id)}>
                      <input 
                        type="text" 
                        className="comment-input" 
                        aria-label="Write a comment"
                        placeholder={currentUser ? "Write a comment..." : "Login to join the discussion"}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        disabled={!currentUser || commentSubmitting}
                      />
                      <button type="submit" className="comment-submit" disabled={!currentUser || !commentText.trim() || commentSubmitting}>{commentSubmitting ? 'Posting…' : 'Post'}</button>
                    </form>
                  </div>
                )}
                
              </article>
            )})
          )}
        </div>
      </div>
      {!isSavedPage && <aside className="feed-side-rail" aria-label="Campus community">
        <section className="rail-card rail-welcome">
          <span className="rail-eyebrow">YOUR CAMPUS, HEARD</span>
          <h2>A campus conversation that moves things forward.</h2>
          <p>Share ideas, ask questions, and keep up with what students care about.</p>
          <button type="button" onClick={() => onCreatePost('idea')}>Share an idea <Icon name="arrowRight" size={15} /></button>
        </section>
        <section className="rail-card">
          <div className="rail-section-heading"><div><span className="rail-eyebrow">THE COMMUNITY</span><h3>Trending topics</h3></div><Icon name="impact" size={16} /></div>
          {popularTopics.length ? <div className="trending-topic-list">{popularTopics.map(([topic, count], index) => <button type="button" key={topic} onClick={() => setSelectedTopic(topic)}><span className="topic-rank">0{index + 1}</span><span className="topic-name">{topic}<small>{count} {count === 1 ? 'post' : 'posts'}</small></span><Icon className="topic-arrow" name="arrowRight" size={14} /></button>)}</div> : <p className="rail-empty">Topics will appear as people start posting.</p>}
        </section>
        <section className="rail-card rail-poll-card">
          <div className="rail-section-heading"><div><span className="rail-eyebrow">CAMPUS PULSE</span><h3>Quick poll</h3></div><Icon name="poll" size={16} /></div>
          {featuredPoll ? <><p className="rail-poll-question">{featuredPoll.poll.question}</p><span className="rail-poll-meta">{featuredPoll.poll.options.reduce((sum, option) => sum + option.votes, 0)} votes | {featuredPoll.tag}</span><a href={`#post-${featuredPoll._id}`}>View poll <Icon name="arrowRight" size={13} /></a></> : <><p className="rail-empty">Ask the campus and see what everyone thinks.</p><button type="button" className="rail-outline-action" onClick={() => onCreatePost('poll')}>Create a poll <Icon name="arrowRight" size={13} /></button></>}
        </section>
        <p className="rail-privacy-note"><Icon name="shield" size={16} /> Post anonymously, as your alias, or with your profile.</p>
      </aside>}
      </div>
    </main>
  );
}
