import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import api from './api';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Feed from './components/Feed';
import PostModal from './components/PostModal';
import Auth from './components/Auth';
import Admin from './components/Admin';
import Profile from './components/Profile';
import ConfirmDialog from './components/ConfirmDialog';
import ReportDialog from './components/ReportDialog';
import Impact from './components/Impact';
import PollResults from './components/PollResults';
import './site-refresh.css';
import './post-card-redesign.css';

const AUTH_STORAGE_KEY = 'echobox-current-user';

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (!user?.token || !user?._id) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

function App() {
  const [posts, setPosts] = useState([]);
  const [sortMode, setSortMode] = useState('newest');
  const [feedMode, setFeedMode] = useState('for-you');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('echobox-theme') === 'dark');
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState('');
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  
  const [selectedCategory, setSelectedCategory] = useState("All Posts");
  const [selectedPostType, setSelectedPostType] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostType, setNewPostType] = useState('feedback');
  const [editingPost, setEditingPost] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [reportingPostId, setReportingPostId] = useState(null);
  const [actionNotice, setActionNotice] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarHidden, setDesktopSidebarHidden] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = Boolean(currentUser?.isAdmin);
  
  const isAuthPage = location.pathname === '/auth';

  const fetchPosts = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) {
      setPostsLoading(true);
      setPostsError('');
    }
    try {
      const endpoint = isAdmin ? '/posts/admin' : '/posts';
      const res = await api.get(endpoint);
      setPosts(res.data);
      setPostsError('');
    } catch (err) {
      console.error('Failed to fetch posts', err);
      if (!quiet) setPostsError(err.response?.data?.error || 'Could not load feedback. Check your connection and try again.');
    } finally { if (!quiet) setPostsLoading(false); }
  }, [isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([]);
      return;
    }
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setActionNotice(err.response?.data?.error || 'Could not load the user list.');
    }
  }, [isAdmin]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?._id) return;
    api.get('/auth/profile').then(({ data }) => {
      setCurrentUser(user => user?._id === data._id ? { ...user, ...data } : user);
    }).catch(err => console.error('Could not refresh account details:', err));
  }, [currentUser?._id]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('echobox-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    setSavedOnly(location.pathname === '/saved');
  }, [location.pathname]);

  useEffect(() => {
    fetchPosts();
    fetchUsers();
  }, [fetchPosts, fetchUsers]);

  useEffect(() => {
    let lastRefreshAt = 0;
    const refreshWhenActive = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefreshAt < 1000) return;
      lastRefreshAt = Date.now();
      fetchPosts({ quiet: true });
    };
    const intervalId = window.setInterval(refreshWhenActive, 15000);
    window.addEventListener('focus', refreshWhenActive);
    document.addEventListener('visibilitychange', refreshWhenActive);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenActive);
      document.removeEventListener('visibilitychange', refreshWhenActive);
    };
  }, [fetchPosts]);

  useEffect(() => {
    if (!actionNotice) return undefined;
    const timeoutId = window.setTimeout(() => setActionNotice(''), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [actionNotice]);

  const cancelConfirmation = useCallback(() => setConfirmation(null), []);

  const confirmPendingAction = () => {
    const action = confirmation?.onConfirm;
    setConfirmation(null);
    action?.();
  };

  const handleRegister = async registration => {
    try {
      const res = await api.post('/auth/register', registration);
      const sessionUser = { ...res.data.user, token: res.data.token };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
      navigate('/');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Registration failed. Please try again.' };
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await api.post('/auth/login', { username, password });
      const sessionUser = { ...res.data.user, token: res.data.token };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
      navigate('/');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Could not sign in. Please try again.' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setCurrentUser(null);
    navigate('/auth');
  };

  const handleUpvote = async (id) => {
    if (!currentUser) { setActionNotice('Sign in to support posts.'); return false; }
    try {
      const res = await api.put(`/posts/${id}/vote`, { type: 'up' });
      setPosts(currentPosts => currentPosts.map(post => post._id === id ? res.data : post));
      return true;
    } catch (err) {
      console.error(err);
      setActionNotice(err.response?.data?.error || 'Could not save your vote. Please try again.');
      return false;
    }
  };

  const handleDownvote = async (id) => {
    if (!currentUser) { setActionNotice('Sign in to vote on feedback.'); return false; }
    try {
      const res = await api.put(`/posts/${id}/vote`, { type: 'down' });
      if (res.data.deleted) {
        setPosts(currentPosts => currentPosts.filter(post => post._id !== id));
      } else {
        setPosts(currentPosts => currentPosts.map(post => post._id === id ? res.data : post));
      }
      return true;
    } catch (err) {
      console.error(err);
      setActionNotice(err.response?.data?.error || 'Could not save your vote. Please try again.');
      return false;
    }
  };

  const handleReport = (id) => {
    if (!currentUser) return setActionNotice('Sign in to report a post.');
    setReportingPostId(id);
  };

  const submitReport = async ({ reason, details }) => {
    const id = reportingPostId;
    if (!id) return { success: false, error: 'The feedback could not be found.' };
    try {
      const res = await api.put(`/posts/${id}/report`, { reason, details });
      setPosts(currentPosts => currentPosts.map(post => post._id === id ? res.data : post));
      setReportingPostId(null);
      setActionNotice('Your report was sent to the administrators.');
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.response?.data?.error || 'Could not submit your report. Please try again.' };
    }
  };

  const handleAddComment = async (postId, text, parentCommentId = '') => {
    if (!currentUser) { setActionNotice('Sign in to join the discussion.'); return false; }
    try {
      const res = await api.post(`/posts/${postId}/comment`, { text, parentCommentId });
      setPosts(currentPosts => currentPosts.map(post => post._id === postId ? res.data : post));
      setActionNotice('Comment posted.');
      return true;
    } catch (err) {
      console.error(err);
      setActionNotice(err.response?.data?.error || 'Could not post your comment. Please try again.');
      return false;
    }
  };

  const handleAddPost = async (newPost) => {
    try {
      const res = await api.post('/posts', newPost);
      setPosts(currentPosts => [res.data, ...currentPosts]);
      setIsModalOpen(false);
      return true;
    } catch (err) {
      console.error(err);
      setActionNotice(err.response?.data?.error || 'Could not post your feedback. Please try again.');
      return false;
    }
  };

  const handleEditPost = async (id, updatedPost) => {
    try {
      const { data } = await api.put(`/posts/${id}`, updatedPost);
      setPosts(currentPosts => currentPosts.map(post => post._id === id ? data : post));
      setEditingPost(null);
      return true;
    } catch (err) {
      console.error('Failed to edit feedback', err);
      setActionNotice(err.response?.data?.error || 'Could not save your changes. Please try again.');
      return false;
    }
  };

  const openPostEditor = post => {
    setIsModalOpen(false);
    setEditingPost(post);
  };

  const handleFollowPost = async id => {
    if (!currentUser) { setActionNotice('Sign in to follow posts and receive updates.'); return false; }
    try {
      const { data } = await api.put(`/posts/${id}/follow`);
      setCurrentUser(user => {
        const followedPosts = new Set(user.followedPosts || []);
        if (data.following) followedPosts.add(id); else followedPosts.delete(id);
        return { ...user, followedPosts: [...followedPosts] };
      });
      setActionNotice(data.following ? 'Following this post. You’ll receive update notifications.' : 'You are no longer following this post.');
      return true;
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not follow this post.'); return false; }
  };

  const handleSavePost = async id => {
    if (!currentUser) { setActionNotice('Sign in to save posts.'); return false; }
    try {
      const { data } = await api.put(`/posts/${id}/save`);
      setPosts(items => items.map(post => post._id === id ? { ...post, isSaved: data.saved } : post));
      setCurrentUser(user => {
        const savedPosts = new Set(user.savedPosts || []);
        if (data.saved) savedPosts.add(id); else savedPosts.delete(id);
        return { ...user, savedPosts: [...savedPosts] };
      });
      setActionNotice(data.saved ? 'Post saved to your library.' : 'Post removed from your library.');
      return true;
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not update saved posts.'); return false; }
  };

  const handleFollowTopic = async topic => {
    if (!currentUser) { setActionNotice('Sign in to follow topics.'); return; }
    try {
      const { data } = await api.put(`/posts/topics/${encodeURIComponent(topic)}/follow`);
      setCurrentUser(user => ({ ...user, followedTopics: data.followedTopics }));
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not update followed topics.'); }
  };

  const handleReaction = async (id, kind) => {
    if (!currentUser) { setActionNotice('Sign in to react to posts.'); return false; }
    try {
      const { data } = await api.put(`/posts/${id}/reaction`, { kind });
      setPosts(items => items.map(post => post._id === id ? data : post));
      return true;
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not save your reaction.'); return false; }
  };

  const handlePollVote = async (id, optionId) => {
    if (!currentUser) { setActionNotice('Sign in to vote in polls.'); return; }
    try {
      const { data } = await api.put(`/posts/${id}/poll`, { optionId });
      setPosts(items => items.map(post => post._id === id ? data : post));
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not save your poll vote.'); }
  };

  const handleAdminStatus = async (id, status, resolutionNote = '') => {
    try {
      const { data } = await api.put(`/posts/${id}/status`, { status, resolutionNote });
      setPosts(items => items.map(post => post._id === id ? data : post));
      setActionNotice('Feedback status updated.');
      return true;
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not update feedback status.'); return false; }
  };

  const handleResolutionFeedback = async (id, feedback) => {
    try {
      const { data } = await api.put(`/posts/${id}/resolution-feedback`, { feedback });
      setPosts(items => items.map(post => post._id === id ? data : post));
      setActionNotice(feedback === 'resolved' ? 'Thanks for confirming the resolution.' : 'Thanks. The team can see that this still needs attention.');
      return true;
    } catch (err) {
      setActionNotice(err.response?.data?.error || 'Could not save your resolution feedback.');
      return false;
    }
  };

  const handleAdminReply = async (id, text) => {
    try {
      const { data } = await api.post(`/posts/${id}/reply`, { text });
      setPosts(items => items.map(post => post._id === id ? data : post));
      setActionNotice('Your admin reply was posted.');
      return true;
    } catch (err) { setActionNotice(err.response?.data?.error || 'Could not send the admin reply.'); return false; }
  };

  const handleDeletePost = async (id) => {
    setConfirmation({
      title: 'Delete this feedback?',
      message: 'This permanently removes the feedback and its comments. This action cannot be undone.',
      confirmLabel: 'Delete feedback',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await api.delete(`/posts/${id}`);
          setPosts(currentPosts => currentPosts.filter(post => post._id !== id));
        } catch (err) {
          console.error(err);
          setActionNotice(err.response?.data?.error || 'Could not delete this feedback. Please try again.');
        }
      },
    });
  };

  const handleReviewReport = async (postId, reportId, status) => {
    try {
      const res = await api.put(`/posts/${postId}/reports/${reportId}/review`, { status });
      setPosts(currentPosts => currentPosts.map(post => post._id === postId ? res.data : post));
      return true;
    } catch (err) {
      console.error('Failed to reject post report', err);
      setActionNotice(err.response?.data?.error || 'Could not update this report. Please try again.');
      return false;
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === "All Posts" || post.tag === selectedCategory;
    const matchesSearch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.tag.toLowerCase().includes(searchQuery.toLowerCase()) || (post.topics || []).some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedPostType === 'all' || (post.postType || 'feedback') === selectedPostType;
    const matchesTopic = selectedTopic === 'all' || post.topics?.includes(selectedTopic);
    const matchesSaved = (location.pathname !== '/saved' && !savedOnly) || currentUser?.savedPosts?.includes(post._id);
    const followsPost = currentUser?.followedPosts?.includes(post._id);
    const followsTopic = (post.topics || []).some(topic => currentUser?.followedTopics?.includes(topic));
    const matchesFeedMode = feedMode !== 'following' || (followsPost || followsTopic);
    return matchesCategory && matchesSearch && matchesType && matchesTopic && matchesSaved && matchesFeedMode;
  }).sort((a, b) => {
    if (sortMode === 'top') return b.upvotedBy.length - a.upvotedBy.length;
    if (sortMode === 'discussed') return (b.commentList?.length || 0) - (a.commentList?.length || 0);
    if (sortMode === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const engagementScore = post => (post.upvotedBy?.length || 0) + (post.commentList?.length || 0) * 2 + Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0);
  const lastWeekPosts = posts.filter(post => Date.now() - new Date(post.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000);
  const weeklyHighlight = [...lastWeekPosts].sort((a, b) => {
    return engagementScore(b) - engagementScore(a);
  })[0] || null;
  const topicCounts = posts.reduce((counts, post) => {
    (post.topics || []).forEach(topic => { counts[topic] = (counts[topic] || 0) + 1; });
    return counts;
  }, {});
  const popularTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const featuredPoll = [...posts].filter(post => post.poll?.question).sort((a, b) => engagementScore(b) - engagementScore(a))[0] || null;

  const openComposer = (type = 'feedback') => {
    if (!currentUser) {
      navigate('/auth');
      return;
    }
    setEditingPost(null);
    setNewPostType(type);
    setIsModalOpen(true);
  };

  const showSavedPosts = () => {
    setSelectedCategory('All Posts');
    setSelectedPostType('all');
    setSelectedTopic('all');
    setSearchQuery('');
    setSavedOnly(true);
    setFeedMode('for-you');
    setSortMode('newest');
    navigate('/saved');
  };

  const renderFeed = isSavedPage => <Feed
    posts={filteredPosts}
    onUpvote={handleUpvote}
    onDownvote={handleDownvote}
    onReport={handleReport}
    onAddComment={handleAddComment}
    onFollow={handleFollowPost}
    onSave={handleSavePost}
    onFollowTopic={handleFollowTopic}
    onReaction={handleReaction}
    onPollVote={handlePollVote}
    onResolutionFeedback={handleResolutionFeedback}
    onEdit={openPostEditor}
    onCreatePost={openComposer}
    feedMode={feedMode}
    setFeedMode={setFeedMode}
    setSortMode={setSortMode}
    popularTopics={popularTopics}
    featuredPoll={featuredPoll}
    selectedPostType={selectedPostType}
    setSelectedPostType={setSelectedPostType}
    selectedTopic={selectedTopic}
    setSelectedTopic={setSelectedTopic}
    savedOnly={savedOnly || isSavedPage}
    setSavedOnly={setSavedOnly}
    weeklyHighlight={weeklyHighlight}
    currentUser={currentUser}
    darkMode={darkMode}
    loading={postsLoading}
    error={postsError}
    onRetry={fetchPosts}
    isSavedPage={isSavedPage}
  />;

  if (isAuthPage) {
    return <Auth onLogin={handleLogin} onRegister={handleRegister} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(mode => !mode)} />;
  }

  return (
    <div className={`app-container ${desktopSidebarHidden ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        selectedCategory={selectedCategory} 
        setSelectedCategory={setSelectedCategory}
        onShowSaved={showSavedPosts}
        onClearSaved={() => setSavedOnly(false)}
        openModal={() => openComposer()}
        currentUser={currentUser}
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      {mobileNavOpen && <button className="sidebar-backdrop" aria-label="Close categories" onClick={() => setMobileNavOpen(false)} />}
      <div className="main-content">
        <a className="skip-to-content" href="#primary-content">Skip to main content</a>
        <Header 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          currentUser={currentUser}
          onLogout={handleLogout}
          onMenuToggle={() => {
            if (window.matchMedia('(max-width: 760px)').matches) setMobileNavOpen(open => !open);
            else setDesktopSidebarHidden(hidden => !hidden);
          }}
          onMenuClose={() => setMobileNavOpen(false)}
          menuOpen={mobileNavOpen || desktopSidebarHidden}
          sortMode={sortMode}
          setSortMode={setSortMode}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(mode => !mode)}
        />
        
        <Routes>
          <Route path="/" element={renderFeed(false)} />
          <Route path="/saved" element={currentUser ? renderFeed(true) : <Navigate to="/auth" />} />
          <Route path="/impact" element={<Impact posts={posts} />} />
          <Route path="/polls/:postId/results" element={<PollResults posts={posts} />} />
          
          <Route path="/admin" element={
            currentUser && currentUser.isAdmin ? (
                <Admin
                  posts={posts}
                  users={users}
                  onDeletePost={handleDeletePost}
                  onReviewReport={handleReviewReport}
                  onUpdateStatus={handleAdminStatus}
                  onAdminReply={handleAdminReply}
                  onEditPost={openPostEditor}
                  postsLoading={postsLoading}
                  postsError={postsError}
                  onRetry={fetchPosts}
                />
            ) : (
              <Navigate to="/" />
            )
          } />

          <Route path="/profile" element={
            currentUser ? <Profile currentUser={currentUser} posts={posts} onProfileUpdate={updatedUser => setCurrentUser(user => ({ ...user, ...updatedUser }))} /> : <Navigate to="/auth" />
          } />
        </Routes>
      </div>
      
      {(isModalOpen || editingPost) && (
        <PostModal 
          closeModal={() => { setIsModalOpen(false); setEditingPost(null); }}
          addPost={handleAddPost}
          updatePost={handleEditPost}
          initialPost={editingPost}
          initialType={newPostType}
          currentUserId={currentUser?._id}
          existingPosts={posts}
        />
      )}
      {reportingPostId && <ReportDialog onSubmit={submitReport} onCancel={() => setReportingPostId(null)} />}
      {actionNotice && <div className="app-action-notice" role="status">{actionNotice}</div>}
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          variant={confirmation.variant}
          onCancel={cancelConfirmation}
          onConfirm={confirmPendingAction}
        />
      )}
    </div>
  )
}

export default App;
