import { Link, useParams } from 'react-router-dom';
import './CommunityPages.css';

export default function PollResults({ posts }) {
  const { postId } = useParams();
  const post = posts.find(item => item._id === postId && item.poll?.question);
  if (!post) return <main className="community-page" id="primary-content" tabIndex={-1}><div className="community-empty">This poll could not be found. <Link to="/">Return to the feed</Link></div></main>;
  const total = post.poll.options.reduce((sum, option) => sum + option.votes, 0);
  return <main className="community-page poll-results-page" id="primary-content" tabIndex={-1}>
    <Link className="community-back-link" to={`/#post-${post._id}`}>← Back to the conversation</Link>
    <header><span className="community-eyebrow">POLL RESULTS · {post.tag}</span><h1>{post.poll.question}</h1><p>{post.content}</p></header>
    <section className="poll-results-card"><div className="poll-results-heading"><h2>{post.poll.isClosed ? 'Final results' : 'Current results'}</h2><span>{total} {total === 1 ? 'vote' : 'votes'}</span></div>
      {post.poll.options.map(option => { const percent = total ? Math.round(option.votes / total * 100) : 0; return <div className="poll-results-row" key={option._id}><div><strong>{option.label}</strong><span>{option.votes} · {percent}%</span></div><div className="poll-results-track"><i style={{ width: `${percent}%` }} /></div></div>; })}
      <p>{post.poll.isClosed ? 'Voting is closed. These totals are final.' : `Voting closes ${post.poll.closesAt ? new Date(post.poll.closesAt).toLocaleString() : 'later'}.`}</p>
    </section>
  </main>;
}
