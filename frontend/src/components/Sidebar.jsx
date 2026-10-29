import './Sidebar.css';
import BrandLogo from './BrandLogo';
import Icon from './Icon';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ selectedCategory, setSelectedCategory, openModal, currentUser, isOpen, onClose, onShowSaved, onClearSaved }) {
  const location = useLocation();
  const categories = ["All Posts", "Teacher", "Event", "Facility", "Student Life"];

  return (
    <aside id="site-sidebar" className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <Link className="sidebar-brand-link" to="/" onClick={onClose} aria-label="EchoBox home"><BrandLogo /></Link>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close navigation menu"><Icon name="close" /></button>
      </div>
      
      {currentUser ? (
        <button className="post-btn" onClick={() => { openModal(); onClose(); }}>+ Create a post</button>
      ) : (
        <Link className="login-prompt" to="/auth" onClick={onClose}>Sign in to create a post</Link>
      )}
      
      <nav className="sidebar-nav" aria-label="Main navigation">
        <h3 className="nav-title">WORKSPACE</h3>
        <ul className="primary-nav-list">
          <li><Link to="/" onClick={onClose} className={location.pathname === '/' ? 'active' : ''}><Icon className="sidebar-nav-icon" name="home" />Feed</Link></li>
          <li><Link to="/impact" onClick={onClose} className={location.pathname === '/impact' ? 'active' : ''}><Icon className="sidebar-nav-icon" name="impact" />Campus impact</Link></li>
          {currentUser && <li><Link to="/profile" onClick={onClose} className={location.pathname === '/profile' ? 'active' : ''}><Icon className="sidebar-nav-icon" name="user" />Profile</Link></li>}
          {currentUser && <li><button type="button" aria-current={location.pathname === '/saved' ? 'page' : undefined} className={location.pathname === '/saved' ? 'active' : ''} onClick={() => { onShowSaved?.(); onClose(); }}><Icon className="sidebar-nav-icon" name="bookmark" />Saved posts</button></li>}
          {currentUser?.isAdmin && <li><Link to="/admin" onClick={onClose} className={location.pathname === '/admin' ? 'active' : ''}><Icon className="sidebar-nav-icon" name="grid" />Admin tools</Link></li>}
        </ul>
      </nav>

      {location.pathname === '/' && <nav className="category-nav" aria-label="Filter feed by category">
        <h3 className="nav-title">EXPLORE CATEGORIES</h3>
        <ul>
          {categories.map(cat => (
            <li key={cat}><button type="button" aria-pressed={selectedCategory === cat} className={selectedCategory === cat ? 'active' : ''} onClick={() => { setSelectedCategory(cat); onClearSaved?.(); onClose(); }}><Icon className="category-dot" name="category" size={14} />{cat}</button></li>
          ))}
        </ul>
      </nav>}

      <div className="anonymity-shield">
        <div className="shield-icon"><Icon name="shield" size={21} /></div>
        <h4>YOUR VOICE, YOUR CHOICE</h4>
        <p>Choose to post anonymously, as your campus alias, or with your profile.</p>
      </div>
    </aside>
  );
}
