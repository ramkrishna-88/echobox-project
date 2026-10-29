import { Link } from 'react-router-dom';
import './CommunityPages.css';

export default function Impact({ posts }) {
  const resolved = posts.filter(post => ['feedback', 'idea'].includes(post.postType || 'feedback') && post.status === 'resolved')
    .sort((a, b) => new Date(b.statusUpdatedAt || b.updatedAt) - new Date(a.statusUpdatedAt || a.updatedAt));
  const categories = [...new Set(resolved.map(post => post.tag))];
  return <main className="community-page impact-page" id="primary-content" tabIndex={-1}>
    <header><span className="community-eyebrow">CAMPUS PROGRESS</span><h1>EchoBox impact</h1><p>See campus feedback and ideas that have reached a resolution.</p></header>
    <section className="impact-summary"><strong>{resolved.length}</strong><span>resolved {resolved.length === 1 ? 'item' : 'items'}</span><small>{categories.length ? `Across ${categories.join(', ')}` : 'Resolved updates will appear here.'}</small></section>
    <div className="impact-list">{resolved.length ? resolved.map(post => <article className="impact-card" key={post._id}>
      <div className="impact-card-meta"><span>{post.tag}</span><span>Resolved {new Date(post.statusUpdatedAt || post.updatedAt).toLocaleDateString()}</span></div>
      <h2>{post.content}</h2>
      {post.resolutionNote ? <div className="impact-resolution"><strong>Campus update</strong><p>{post.resolutionNote}</p></div> : <p className="impact-pending-note">This item was marked resolved.</p>}
      <Link to={`/#post-${post._id}`}>View conversation</Link>
    </article>) : <div className="community-empty">There are no resolved feedback items yet.</div>}</div>
  </main>;
}
