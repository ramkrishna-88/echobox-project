import { useEffect, useRef, useState } from 'react';
import api from '../api';
import Icon from './Icon';
import './Profile.css';

const getInitials = (username = '') => username.trim().slice(0, 2).toUpperCase() || 'EB';

const readAsImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('This image could not be opened.'));
    image.src = reader.result;
  };
  reader.onerror = () => reject(new Error('This image could not be read.'));
  reader.readAsDataURL(file);
});

const makeAvatar = async (file) => {
  const image = await readAsImage(file);
  const size = 480;
  const scale = Math.min(size / image.width, size / image.height, 1);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
};

export default function Profile({ currentUser, posts = [], onProfileUpdate }) {
  const legacyStorageKey = `echobox-profile-photo-${currentUser._id}`;
  const inputRef = useRef(null);
  const [photo, setPhoto] = useState(() => {
    try {
      return currentUser.profilePhoto || localStorage.getItem(legacyStorageKey) || '';
    } catch {
      return currentUser.profilePhoto || '';
    }
  });
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [notificationFeedback, setNotificationFeedback] = useState(null);
  const [email, setEmail] = useState(currentUser.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({ status: true, reply: true, comment: true, topic: true, ...(currentUser.notificationPreferences || {}) });
  const migrationAttempted = useRef(false);

  useEffect(() => {
    if (currentUser.profilePhoto || !photo || migrationAttempted.current) return;
    migrationAttempted.current = true;
    setIsSaving(true);
    api.patch('/auth/profile', { profilePhoto: photo })
      .then(res => {
        onProfileUpdate(res.data);
        localStorage.removeItem(legacyStorageKey);
        setMessage('Profile photo saved to your account.');
      })
      .catch(error => {
        setIsError(true);
        setMessage(error.response?.data?.error || 'Could not save your existing profile photo.');
      })
      .finally(() => setIsSaving(false));
  }, [currentUser.profilePhoto, legacyStorageKey, onProfileUpdate, photo]);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setIsError(true);
      setMessage('Choose an image file to update your photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setIsError(true);
      setMessage('Choose an image smaller than 5 MB.');
      return;
    }

    try {
      const nextPhoto = await makeAvatar(file);
      setIsSaving(true);
      const res = await api.patch('/auth/profile', { profilePhoto: nextPhoto });
      setPhoto(nextPhoto);
      onProfileUpdate(res.data);
      localStorage.removeItem(legacyStorageKey);
      setIsError(false);
      setMessage('Profile photo saved to your account.');
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.error || error.message || 'Could not save your profile photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const removePhoto = async () => {
    try {
      setIsSaving(true);
      const res = await api.patch('/auth/profile', { profilePhoto: null });
      setPhoto('');
      onProfileUpdate(res.data);
      localStorage.removeItem(legacyStorageKey);
      setIsError(false);
      setMessage('Profile photo removed from your account.');
    } catch (error) {
      setIsError(true);
      setMessage(error.response?.data?.error || 'Could not remove the saved photo.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveEmail = async event => {
    event.preventDefault();
    setEmailFeedback(null);
    setIsSaving(true);
    try {
      const res = await api.patch('/auth/profile', { email });
      onProfileUpdate(res.data);
      setEmailFeedback({ type: 'success', text: 'Email address updated.' });
      setIsError(false); setMessage('Email address updated.');
    } catch (error) {
      const text = error.response?.data?.error || 'Could not update your email address.';
      setEmailFeedback({ type: 'error', text });
      setIsError(true); setMessage(text);
    } finally { setIsSaving(false); }
  };

  const savePassword = async event => {
    event.preventDefault();
    setPasswordFeedback(null);
    setIsSaving(true);
    try {
      await api.patch('/auth/profile', { currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setShowCurrentPassword(false); setShowNewPassword(false); setIsError(false); setMessage('Password updated successfully.');
      setPasswordFeedback({ type: 'success', text: 'Password updated successfully.' });
    } catch (error) {
      const text = error.response?.data?.error || 'Could not update your password.';
      setPasswordFeedback({ type: 'error', text });
      setIsError(true); setMessage(text);
    } finally { setIsSaving(false); }
  };

  const saveNotificationPreferences = async event => {
    event.preventDefault(); setNotificationFeedback(null); setIsSaving(true);
    try {
      const res = await api.patch('/auth/profile', { notificationPreferences });
      onProfileUpdate(res.data); setIsError(false); setMessage('Notification preferences saved.');
      setNotificationFeedback({ type: 'success', text: 'Notification preferences saved.' });
    } catch (error) {
      const text = error.response?.data?.error || 'Could not save notification preferences.';
      setNotificationFeedback({ type: 'error', text });
      setIsError(true); setMessage(text);
    }
    finally { setIsSaving(false); }
  };

  const renderFeedback = feedback => feedback && (
    <p className={`profile-form-feedback ${feedback.type === 'error' ? 'profile-form-feedback-error' : ''}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
      {feedback.text}
    </p>
  );

  const role = currentUser.isAdmin
    ? 'Administrator'
    : (currentUser.campusRole || 'student').replace(/^./, letter => letter.toUpperCase());
  const ownPostCount = posts.filter(post => post.author?._id === currentUser._id || (!currentUser.isAdmin && post.canEdit)).length;
  const savedPostCount = currentUser.savedPosts?.length || 0;
  const followedCount = (currentUser.followedPosts?.length || 0) + (currentUser.followedTopics?.length || 0);

  return (
    <main className="profile-page" id="primary-content" tabIndex={-1}>
      <div className="profile-heading">
        <span className="profile-eyebrow">YOUR ACCOUNT</span>
        <h1>Profile</h1>
        <p>Manage your EchoBox identity and account details.</p>
      </div>

      <section className="profile-card" aria-labelledby="profile-card-title">
        <div className="profile-card-banner" />
        <div className="profile-card-content">
          <div className="profile-photo-column">
            <div className="profile-avatar" aria-label={`${currentUser.username}'s profile photo`}>
              {photo ? <img src={photo} alt={`${currentUser.username}'s profile`} /> : <span>{getInitials(currentUser.username)}</span>}
            </div>
            <input
              ref={inputRef}
              className="profile-file-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              aria-label="Choose a profile photo"
            />
            <button className="profile-photo-button" type="button" onClick={() => inputRef.current?.click()} disabled={isSaving}>
              {isSaving ? 'Saving…' : photo ? 'Change photo' : 'Add a photo'}
            </button>
            {photo && <button className="profile-remove-button" type="button" onClick={removePhoto} disabled={isSaving}>Remove</button>}
            <span className="profile-photo-hint">Image up to 5 MB</span>
          </div>

          <div className="profile-details">
            <div className="profile-name-row">
              <div>
                <span className="profile-handle">@{currentUser.username}</span>
                <h2 id="profile-card-title">{currentUser.username}</h2>
              </div>
              <span className={`profile-role ${currentUser.isAdmin ? 'profile-role-admin' : ''}`}>
                {role}
              </span>
            </div>

            <div className="profile-fields">
              <div className="profile-field">
                <span>Email address <em>Private</em></span>
                <strong>{currentUser.email || 'Not provided'}</strong>
              </div>
              <div className="profile-field">
                <span>Campus role</span>
                <strong>{currentUser.isAdmin ? 'Administrator' : (currentUser.campusRole || 'student').replace(/^./, letter => letter.toUpperCase())}</strong>
              </div>
              {!currentUser.isAdmin && <div className="profile-field"><span>{currentUser.campusRole === 'student' ? 'Department / program' : 'Department'}</span><strong>{currentUser.department || 'Not provided'}</strong></div>}
              {!currentUser.isAdmin && currentUser.campusRole === 'student' && <div className="profile-field"><span>Academic year</span><strong>{currentUser.studyYear === 'postgraduate' ? 'Postgraduate' : currentUser.studyYear ? `${currentUser.studyYear}${currentUser.studyYear === '1' ? 'st' : currentUser.studyYear === '2' ? 'nd' : currentUser.studyYear === '3' ? 'rd' : 'th'} year` : 'Not provided'}</strong></div>}
              {!currentUser.isAdmin && currentUser.campusRole !== 'student' && currentUser.roleTitle && <div className="profile-field"><span>{currentUser.campusRole === 'faculty' ? 'Faculty title' : 'Job title'}</span><strong>{currentUser.roleTitle}</strong></div>}
              <div className="profile-field profile-field-privacy">
                <span>Post privacy</span>
                <strong>Choose anonymous, alias, or profile for each post</strong>
              </div>
            </div>

            {message && <p className={`profile-message ${isError ? 'profile-message-error' : ''}`} role="status">{message}</p>}
          </div>
        </div>
      </section>

      <section className="profile-activity" aria-label="Your EchoBox activity">
        <article><span className="activity-icon"><Icon name="message" size={18} /></span><span><strong>{ownPostCount}</strong><small>Your posts</small></span></article>
        <article><span className="activity-icon"><Icon name="bookmark" size={18} /></span><span><strong>{savedPostCount}</strong><small>Saved posts</small></span></article>
        <article><span className="activity-icon"><Icon name="user" size={18} /></span><span><strong>{followedCount}</strong><small>Following</small></span></article>
      </section>

      <div className="profile-settings-intro"><span className="profile-eyebrow">ACCOUNT SETTINGS</span><h2>Keep your account up to date</h2><p>Your email and password are only used to manage your sign-in.</p></div>
      <div className="profile-settings-grid">
        <form className="profile-settings-card" onSubmit={saveEmail}>
          <h2>Email address</h2><p>Use an email address you can access.</p>
          <label>Email<input type="email" required value={email} onChange={event => { setEmail(event.target.value); setEmailFeedback(null); }} autoComplete="email" /></label>
          <button type="submit" disabled={isSaving || email === currentUser.email}>Save email</button>
          {renderFeedback(emailFeedback)}
        </form>
        <form className="profile-settings-card" onSubmit={savePassword}>
          <h2>Change password</h2><p>Choose a password with at least 8 characters.</p>
          <label>Current password<div className="profile-password-control"><input type={showCurrentPassword ? 'text' : 'password'} required minLength="8" value={currentPassword} onChange={event => { setCurrentPassword(event.target.value); setPasswordFeedback(null); }} autoComplete="current-password" /><button type="button" className="profile-password-toggle" aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'} aria-pressed={showCurrentPassword} onClick={() => setShowCurrentPassword(value => !value)}><Icon name={showCurrentPassword ? 'eyeOff' : 'eye'} size={18} /></button></div></label>
          <label>New password<div className="profile-password-control"><input type={showNewPassword ? 'text' : 'password'} required minLength="8" maxLength="128" value={newPassword} onChange={event => { setNewPassword(event.target.value); setPasswordFeedback(null); }} autoComplete="new-password" /><button type="button" className="profile-password-toggle" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} aria-pressed={showNewPassword} onClick={() => setShowNewPassword(value => !value)}><Icon name={showNewPassword ? 'eyeOff' : 'eye'} size={18} /></button></div></label>
          <button type="submit" disabled={isSaving || !currentPassword || !newPassword}>Update password</button>
          {renderFeedback(passwordFeedback)}
        </form>
      </div>

      <form className="profile-settings-card profile-notification-settings" onSubmit={saveNotificationPreferences}>
        <h2>Notification preferences</h2><p>Choose which EchoBox activity can send you an in-app notification.</p>
        {[[ 'status', 'Feedback status updates' ], [ 'reply', 'Official admin replies' ], [ 'comment', 'Comments on posts you follow' ], [ 'topic', 'New posts in followed topics' ]].map(([key, label]) => <label className="notification-preference" key={key}><span>{label}</span><input type="checkbox" checked={notificationPreferences[key]} onChange={event => { setNotificationPreferences(current => ({ ...current, [key]: event.target.checked })); setNotificationFeedback(null); }} /></label>)}
        <button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save notification settings'}</button>
        {renderFeedback(notificationFeedback)}
      </form>

      <aside className="profile-privacy-note">
        <span className="profile-privacy-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div>
          <h3>Your campus identity, your way</h3>
          <p>Your profile photo is saved to your account. Feedback posts continue to appear separately from your profile.</p>
        </div>
      </aside>
    </main>
  );
}
