import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import api from '../api';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import './Header.css';

export default function Header({ searchQuery, setSearchQuery, currentUser, onLogout, onMenuToggle, onMenuClose, menuOpen, sortMode, setSortMode, darkMode, onToggleDarkMode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = currentUser?._id;
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const notificationRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!userId) { setNotifications([]); return undefined; }
    let active = true;
    const load = () => api.get('/auth/notifications').then(({ data }) => { if (active) { setNotifications(data); setNotificationError(''); } }).catch(() => { if (active) setNotificationError('Could not load notifications.'); });
    load(); const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [userId]);

  useEffect(() => {
    if (!showNotifications) return undefined;
    const closeOnOutside = event => {
      if (!notificationRef.current?.contains(event.target)) setShowNotifications(false);
    };
    const closeOnEscape = event => { if (event.key === 'Escape') setShowNotifications(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!showAccountMenu) return undefined;
    const closeOnOutside = event => {
      if (!accountRef.current?.contains(event.target)) setShowAccountMenu(false);
    };
    const closeOnEscape = event => { if (event.key === 'Escape') setShowAccountMenu(false); };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showAccountMenu]);

  const openNotification = async note => {
    if (!note.isRead) {
      try { await api.patch(`/auth/notifications/${note._id}/read`); } catch (error) { console.error('Could not mark notification read:', error); }
      setNotifications(items => items.map(item => item._id === note._id ? { ...item, isRead: true } : item));
    }
    setShowNotifications(false);
    navigate('/');
    if (note.post?.id) window.setTimeout(() => document.getElementById(`post-${note.post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  return (
    <header className="main-header">
      <button type="button" className="mobile-menu-toggle" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={Boolean(menuOpen)} aria-controls="site-sidebar" onClick={onMenuToggle}><Icon name="menu" size={19} /></button>
      <Link className="header-brand" to="/" aria-label="EchoBox home"><BrandLogo compact /><span className="header-brand-label">EchoBox</span></Link>
      <div className="header-actions">
        {['/', '/saved'].includes(location.pathname) && (
          <div className="search-bar">
            <span className="search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input aria-label={location.pathname === '/saved' ? 'Search saved posts' : 'Search campus posts'}
              type="text" 
              placeholder={location.pathname === '/saved' ? 'Search saved posts...' : 'Search campus posts...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {['/', '/saved'].includes(location.pathname) && <select className="feed-sort" aria-label="Sort campus posts" value={sortMode} onChange={event => setSortMode(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="top">Most upvoted</option><option value="discussed">Most discussed</option></select>}
        <button className="theme-toggle" type="button" onClick={onToggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{darkMode ? <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" /> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>}</svg>
          <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
        </button>
        {currentUser && <div className="notification-wrap" ref={notificationRef}>
          <button className="notification-toggle" type="button" aria-label={`Open notifications${notifications.filter(item => !item.isRead).length ? `, ${notifications.filter(item => !item.isRead).length} unread` : ''}`} aria-controls="notification-popover" aria-expanded={showNotifications} onClick={() => { setShowNotifications(value => !value); setShowAccountMenu(false); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
            {notifications.filter(item => !item.isRead).length > 0 && <span className="notification-count">{notifications.filter(item => !item.isRead).length > 9 ? '9+' : notifications.filter(item => !item.isRead).length}</span>}
          </button>
          {showNotifications && <section className="notification-popover" id="notification-popover" aria-label="Notifications">
            <div className="notification-heading"><div><h2>Your updates</h2><p>Activity from posts and topics you follow</p></div><button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setShowNotifications(false)}><Icon name="close" /></button></div>
            {notifications.some(item => !item.isRead) && <button type="button" className="mark-all-read" onClick={async () => {
              const unread = notifications.filter(item => !item.isRead);
              await Promise.all(unread.map(item => api.patch(`/auth/notifications/${item._id}/read`).catch(() => null)));
              setNotifications(items => items.map(item => ({ ...item, isRead: true })));
            }}>Mark all as read</button>}
            <div className="notification-list">{notificationError ? <p className="notification-empty" role="alert">{notificationError}</p> : notifications.length === 0 ? <p className="notification-empty">No updates yet. Follow a suggestion to get notified.</p> : notifications.map(note => <button key={note._id} type="button" className={`notification-item ${note.isRead ? '' : 'unread'}`} onClick={() => openNotification(note)}>
              <span className={`notification-type notification-type-${note.kind}`}>{note.kind === 'status' ? 'STATUS' : note.kind === 'reply' ? 'ADMIN REPLY' : note.kind === 'topic' ? 'FOLLOWED TOPIC' : 'COMMENT'}</span>
              <strong>{note.message}</strong>{note.post?.content && <small>{note.post.content.slice(0, 90)}</small>}<time>{new Date(note.createdAt).toLocaleString()}</time>
            </button>)}</div>
          </section>}
        </div>}
        
        {currentUser ? (
          <div className="account-menu-wrap" ref={accountRef}>
            <button className="account-menu-trigger" type="button" aria-label={`Account menu for ${currentUser.username}`} aria-haspopup="menu" aria-expanded={showAccountMenu} onClick={() => { setShowAccountMenu(open => !open); setShowNotifications(false); }}>
              <span className="account-avatar">{currentUser.profilePhoto ? <img src={currentUser.profilePhoto} alt="" /> : currentUser.username.slice(0, 1).toUpperCase()}</span>
              <span className="account-trigger-name">@{currentUser.username}</span>
              <svg className="account-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg>
            </button>
            {showAccountMenu && <section className="account-dropdown" role="menu" aria-label="Account menu">
              <div className="account-dropdown-user"><strong>@{currentUser.username}</strong><span>{currentUser.isAdmin ? 'Administrator account' : 'Student account'}</span></div>
              <Link role="menuitem" to="/profile" onClick={() => { setShowAccountMenu(false); onMenuClose(); }}><Icon name="user" size={16} /> Profile and settings</Link>
              {currentUser.isAdmin && <Link role="menuitem" to="/admin" onClick={() => { setShowAccountMenu(false); onMenuClose(); }}><Icon name="grid" size={16} /> Admin tools</Link>}
              <button role="menuitem" type="button" onClick={() => { setShowAccountMenu(false); onLogout(); }}><Icon name="logOut" size={16} /> Sign out</button>
            </section>}
          </div>
        ) : (
          <Link to="/auth" className="login-link">Login</Link>
        )}
      </div>
    </header>
  );
}
