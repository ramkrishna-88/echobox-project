import { useRef, useState } from 'react';
import Icon from './Icon';
import './PostModal.css';

const postTypes = [
  ['feedback', 'Feedback', 'category', 'Ask campus staff to address an issue'],
  ['idea', 'Idea', 'idea', 'Suggest a change or improvement'],
  ['discussion', 'Discussion', 'message', 'Start a question or conversation'],
  ['moment', 'Campus moment', 'heart', 'Share a feeling or experience'],
  ['poll', 'Poll', 'poll', 'Let the campus vote on options']
];
const availableTopics = ['Study life', 'Clubs', 'Food', 'Events', 'Wellbeing', 'Campus life'];

async function compressImage(file) {
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = source;
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Could not open this image.')); });
  const scale = Math.min(1200 / image.width, 1200 / image.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = .78; let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > 300000 && quality > .38) { quality -= .08; result = canvas.toDataURL('image/jpeg', quality); }
  if (result.length > 300000) {
    canvas.width = Math.round(canvas.width * .72); canvas.height = Math.round(canvas.height * .72);
    const smaller = document.createElement('canvas'); smaller.width = canvas.width; smaller.height = canvas.height;
    smaller.getContext('2d').drawImage(image, 0, 0, smaller.width, smaller.height);
    result = smaller.toDataURL('image/jpeg', .48);
  }
  if (result.length > 400000) throw new Error('This image is too large after resizing. Choose another image.');
  return result;
}

export default function PostModal({ closeModal, addPost, updatePost, initialPost = null, initialType = 'feedback', currentUserId, existingPosts = [] }) {
  const [content, setContent] = useState(initialPost?.content || '');
  const [tag, setTag] = useState(initialPost?.tag || 'Student Life');
  const [postType, setPostType] = useState(initialPost?.postType || initialType);
  const [topics, setTopics] = useState(initialPost?.topics || []);
  const [visibility, setVisibility] = useState(initialPost?.visibility || 'anonymous');
  const initialPoll = initialPost?.poll;
  const [pollEnabled, setPollEnabled] = useState(Boolean(initialPoll?.question) || initialPost?.postType === 'poll');
  const [pollQuestion, setPollQuestion] = useState(initialPoll?.question || '');
  const [pollOptions, setPollOptions] = useState(initialPoll?.options?.map(option => option.label) || ['', '']);
  const [pollDurationDays, setPollDurationDays] = useState(7);
  const [images, setImages] = useState(() => [
    ...(initialPost?.images || []),
    ...(initialPost?.image && !(initialPost?.images || []).includes(initialPost.image) ? [initialPost.image] : [])
  ].map((data, index) => ({ data, name: `Existing image ${index + 1}` })));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const draftKey = `echobox-post-draft-${currentUserId || 'guest'}`;
  const [hasDraft, setHasDraft] = useState(() => !initialPost && Boolean(localStorage.getItem(draftKey)));
  const imageInput = useRef(null);
  const pollLocked = Boolean(initialPost?.poll?.options?.some(option => option.votes > 0));
  const usesPoll = postType === 'poll' || (postType === 'idea' && pollEnabled);
  const similarPosts = (() => {
    if (!['feedback', 'idea'].includes(postType) || content.trim().length < 24) return [];
    const terms = new Set(content.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
    return existingPosts.filter(post => post._id !== initialPost?._id && ['feedback', 'idea'].includes(post.postType || 'feedback'))
      .map(post => {
        const other = new Set((post.content.toLowerCase().match(/[a-z0-9]{3,}/g) || []));
        const overlap = [...terms].filter(term => other.has(term)).length;
        return { post, score: overlap / Math.max(1, Math.min(terms.size, other.size)) };
      }).filter(item => item.score >= 0.38).sort((a, b) => b.score - a.score).slice(0, 2);
  })();

  const restoreDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (!draft) return;
      setContent(draft.content || ''); setTag(draft.tag || 'Student Life'); setPostType(draft.postType || 'feedback');
      setTopics(draft.topics || []); setVisibility(draft.visibility || 'anonymous'); setPollQuestion(draft.pollQuestion || '');
      setPollOptions(draft.pollOptions || ['', '']); setPollEnabled(Boolean(draft.pollEnabled)); setImages(draft.images || []);
      setPollDurationDays(draft.pollDurationDays || 7); setError('Draft restored.');
    } catch { setError('The saved draft could not be restored.'); }
  };
  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ content, tag, postType, topics, visibility, pollQuestion, pollOptions, pollEnabled, images, pollDurationDays }));
      setHasDraft(true); setError('Draft saved on this device.');
    } catch { setError('Could not save this draft. Remove some images and try again.'); }
  };

  const handleImage = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    if (files.length + images.length > 5) { setError('You can attach up to 5 images to a post.'); return; }
    const nextImages = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) throw new Error('Choose image files only.');
        if (file.size > 8 * 1024 * 1024) throw new Error('Each original image must be smaller than 8 MB.');
        nextImages.push({ data: await compressImage(file), name: file.name });
      }
      setImages(current => [...current, ...nextImages]); setError('');
    } catch (err) { setError(err.message || 'Could not process these images.'); }
  };

  const handleSubmit = async event => {
    event.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true); setError('');
    try {
      const payload = {
        content: content.trim(), tag, images: images.map(item => item.data), postType, topics, visibility,
        ...(pollLocked ? {} : { poll: usesPoll ? { question: pollQuestion.trim(), options: pollOptions.map(option => option.trim()).filter(Boolean), durationDays: pollDurationDays } : null })
      };
      const succeeded = initialPost ? await updatePost(initialPost._id, payload) : await addPost(payload);
      if (succeeded === false) setError(initialPost ? 'Could not save your changes. Please try again.' : 'Could not post your feedback. Please try again.');
      else if (!initialPost) { localStorage.removeItem(draftKey); setHasDraft(false); }
    }
    catch (err) { setError(err.message || (initialPost ? 'Could not save your changes.' : 'Could not post your feedback.')); }
    finally { setIsSubmitting(false); }
  };

  return <div className="modal-overlay" onClick={closeModal}>
    <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="new-post-heading" onClick={event => event.stopPropagation()}>
      <button className="close-btn" type="button" aria-label="Close feedback form" onClick={closeModal}><Icon name="close" /></button>
      <h2 id="new-post-heading">{initialPost ? 'Edit Your Post' : 'Create a Post'}</h2>
      <p className="modal-subtitle">{initialPost ? 'Update your post and how it appears in the campus feed.' : 'Share something with campus or create a poll for everyone to answer.'}</p>
      {!initialPost && hasDraft && <button type="button" className="restore-draft-button" onClick={restoreDraft}>Restore saved draft</button>}
      <form onSubmit={handleSubmit}>
        <fieldset className="form-group post-type-picker"><legend>What are you sharing?</legend><div className="post-type-grid">{postTypes.map(([value, label, icon, description]) => <button key={value} type="button" className={`post-type-choice ${postType === value ? 'selected' : ''}`} aria-pressed={postType === value} onClick={() => { setPostType(value); if (value === 'poll') setPollEnabled(true); }} disabled={pollLocked}><span className="post-type-icon"><Icon name={icon} size={18} /></span><span><strong>{label}</strong><small>{description}</small></span></button>)}</div><p className="post-type-help">{postType === 'feedback' ? 'Campus staff can track progress and post official updates.' : postType === 'idea' ? 'Students can support the idea; add a poll if you want to collect votes.' : postType === 'discussion' ? 'Start a conversation; no issue status will be shown.' : postType === 'poll' ? 'Create a question with 2 to 5 options. Each person can vote once and change their vote later.' : 'Share a campus experience, achievement, or feeling.'}</p></fieldset>
        <div className="form-group"><label htmlFor="post-category">Category</label><select id="post-category" value={tag} onChange={event => setTag(event.target.value)}><option value="Teacher">Teacher</option><option value="Event">Event</option><option value="Facility">Facility</option><option value="Student Life">Student Life</option></select></div>
        <div className="form-group"><label htmlFor="post-content">{postType === 'feedback' ? 'Your feedback' : postType === 'idea' ? 'Your idea' : postType === 'discussion' ? 'Start the discussion' : postType === 'poll' ? 'Add context for your poll' : 'Your campus moment'}</label><textarea id="post-content" placeholder={postType === 'feedback' ? 'Describe what the campus could improve.' : postType === 'idea' ? 'Share your proposal and why it could help.' : postType === 'discussion' ? 'Ask a question or share a point for the campus to discuss.' : postType === 'poll' ? 'Add any details voters should know before choosing.' : 'Share an experience, achievement, or feeling from campus.'} value={content} onChange={event => setContent(event.target.value)} rows={5} maxLength={5000} required /><small>{content.length}/5,000</small></div>
        <fieldset className="form-group topic-picker"><legend>Topics <span>Choose up to 3</span></legend><div>{availableTopics.map(topic => <label className={`topic-chip ${topics.includes(topic) ? 'selected' : ''}`} key={topic}><input type="checkbox" checked={topics.includes(topic)} disabled={!topics.includes(topic) && topics.length >= 3} onChange={() => setTopics(current => current.includes(topic) ? current.filter(item => item !== topic) : [...current, topic])} /><span className="topic-check" aria-hidden="true">{topics.includes(topic) ? '✓' : '+'}</span><span>{topic}</span></label>)}</div><small>Topics help other students find posts they care about.</small></fieldset>
        <div className="form-group"><label htmlFor="post-visibility">Show this post as</label><select id="post-visibility" value={visibility} onChange={event => setVisibility(event.target.value)}><option value="anonymous">Anonymous</option><option value="alias">My campus alias</option><option value="named">My profile and photo</option></select><small>Your account is still required to post. Anonymous posts hide your identity in the feed.</small></div>
        {(postType === 'poll' || (postType === 'idea' && pollEnabled)) && <fieldset className="form-group poll-builder"><legend>{postType === 'idea' ? <label><input type="checkbox" checked={pollEnabled} onChange={event => setPollEnabled(event.target.checked)} disabled={pollLocked} /> Include a poll with your idea</label> : 'Create a poll'}</legend><label htmlFor="poll-question">Poll question</label><input id="poll-question" maxLength={200} value={pollQuestion} onChange={event => setPollQuestion(event.target.value)} placeholder="What should campus choose?" required disabled={pollLocked} />{pollOptions.map((option, index) => <div className="poll-option-input" key={`poll-option-${index}`}><input aria-label={`Poll option ${index + 1}`} maxLength={100} value={option} onChange={event => setPollOptions(items => items.map((item, optionIndex) => optionIndex === index ? event.target.value : item))} placeholder={`Option ${index + 1}`} required disabled={pollLocked} />{pollOptions.length > 2 && !pollLocked && <button type="button" onClick={() => setPollOptions(items => items.filter((_, optionIndex) => index !== optionIndex))}>Remove</button>}</div>)}{pollOptions.length < 5 && !pollLocked && <button type="button" className="add-poll-option" onClick={() => setPollOptions(items => [...items, ''])}>+ Add option</button>}{!pollLocked && <label htmlFor="poll-duration">Poll closes after<select id="poll-duration" value={pollDurationDays} onChange={event => setPollDurationDays(Number(event.target.value))}><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option></select></label>}{pollLocked && <small>Poll choices are locked after the first vote.</small>}<small>2–5 options · One vote per account · Votes are anonymous</small></fieldset>}
        {similarPosts.length > 0 && <aside className="similar-post-suggestions"><strong>Similar campus feedback</strong><p>These posts may already cover the same issue:</p>{similarPosts.map(({ post }) => <a key={post._id} href={`/#post-${post._id}`} onClick={closeModal}><span>{post.tag} · {(post.status || 'submitted').replace('-', ' ')}</span>{post.content}</a>)}</aside>}
        <div className="form-group"><label htmlFor="post-image">Add images (optional)</label><input ref={imageInput} id="post-image" type="file" accept="image/*" multiple onChange={handleImage} /><small>Up to 5 images. Each original file can be up to 8 MB and is resized before upload.</small>
          {images.length > 0 && <div className="post-image-previews">{images.map((item, index) => <div className="post-image-preview" key={`${item.name}-${index}`}><img src={item.data} alt={`Preview ${index + 1}: ${item.name}`} /><span title={item.name}>{item.name}</span><button type="button" aria-label={`Remove ${item.name}`} onClick={() => setImages(current => current.filter((_, imageIndex) => imageIndex !== index))}>Remove</button></div>)}</div>}
        </div>
        {error && <p className={`post-modal-error ${/saved|restored/i.test(error) ? 'post-modal-success' : ''}`} role="status">{error}</p>}
        <div className="form-actions">{!initialPost && <button type="button" className="cancel-btn" onClick={saveDraft}>Save draft</button>}<button type="button" className="cancel-btn" onClick={closeModal}>Cancel</button><button type="submit" className="submit-btn" disabled={!content.trim() || isSubmitting}>{isSubmitting ? (initialPost ? 'Saving...' : 'Posting...') : initialPost ? 'Save changes' : postType === 'poll' ? 'Publish poll' : 'Share post'}</button></div>
      </form>
    </div>
  </div>;
}
