import { useState } from 'react';
import BrandLogo from './BrandLogo';
import './Auth.css';

const departmentSuggestions = ['Arts and Humanities', 'Business', 'Computer Science', 'Education', 'Engineering', 'Health Sciences', 'Law', 'Science', 'Other'];

export default function Auth({ onLogin, onRegister, darkMode, onToggleDarkMode }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [campusRole, setCampusRole] = useState('student');
  const [department, setDepartment] = useState('');
  const [studyYear, setStudyYear] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault(); setErrorMessage(''); setIsSubmitting(true);
    try {
      const result = isLogin
        ? await onLogin(username.trim(), password)
        : await onRegister({ username: username.trim(), email: email.trim(), password, confirmPassword, campusRole, department: department.trim(), studyYear: campusRole === 'student' ? studyYear : '', roleTitle: campusRole === 'student' ? '' : roleTitle.trim() });
      if (!result?.success) setErrorMessage(result?.error || 'Could not complete your request. Please try again.');
    } catch { setErrorMessage('Could not reach EchoBox. Check your connection and try again.'); }
    finally { setIsSubmitting(false); }
  };

  const toggleMode = () => { setErrorMessage(''); setPassword(''); setConfirmPassword(''); setShowPassword(false); setIsLogin(value => !value); };

  return <main className="auth-wrapper" id="primary-content" tabIndex={-1}>
    <a className="skip-to-content" href="#auth-title">Skip to sign-in form</a>
    <button className="auth-theme-toggle" type="button" onClick={onToggleDarkMode} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>{darkMode ? '☀ Light' : '☾ Dark'}</button>
    <div className="auth-layout">
      <aside className="auth-story">
        <BrandLogo />
        <span className="auth-kicker">YOUR CAMPUS, HEARD</span>
        <h2>Small ideas can make campus better.</h2>
        <p>Share feedback, follow suggestions, and see what happens next—all in one place.</p>
        <div className="auth-benefits"><span><b>01</b> Share campus feedback</span><span><b>02</b> Follow useful suggestions</span><span><b>03</b> See progress and replies</span></div>
        <div className="auth-story-note"><span aria-hidden="true">✓</span> Choose how your identity appears on each post.</div>
      </aside>

      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-form-kicker">{isLogin ? 'GOOD TO SEE YOU AGAIN' : 'GET STARTED'}</span>
        <h1 id="auth-title">{isLogin ? 'Welcome back' : 'Join the conversation'}</h1>
        <p className="auth-subtitle">{isLogin ? 'Sign in to share ideas and follow campus updates.' : 'Create your campus account to share feedback and follow suggestions.'}</p>
        {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
        <form onSubmit={handleSubmit} autoComplete="off">
          {!isLogin && <>
            <div className="form-group"><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@university.edu" required /></div>
            <div className="auth-fields-row">
              <div className="form-group"><label htmlFor="auth-role">Campus role</label><select id="auth-role" value={campusRole} onChange={event => { setCampusRole(event.target.value); setStudyYear(''); setRoleTitle(''); }} required><option value="student">Student</option><option value="faculty">Faculty</option><option value="staff">Staff</option></select></div>
              <div className="form-group"><label htmlFor="auth-department">{campusRole === 'student' ? 'Department / program' : 'Department'}</label><input id="auth-department" list="auth-departments" autoComplete="organization-title" minLength={2} maxLength={80} value={department} onChange={event => setDepartment(event.target.value)} placeholder={campusRole === 'student' ? 'Your department or program' : 'Your department'} required /><datalist id="auth-departments">{departmentSuggestions.map(item => <option key={item} value={item} />)}</datalist></div>
            </div>
            {campusRole === 'student' && <div className="form-group"><label htmlFor="auth-year">Current academic year</label><select id="auth-year" value={studyYear} onChange={event => setStudyYear(event.target.value)} required><option value="" disabled>Select your year</option><option value="1">1st year</option><option value="2">2nd year</option><option value="3">3rd year</option><option value="4">4th year</option><option value="postgraduate">Postgraduate</option></select></div>}
            {campusRole !== 'student' && <div className="form-group"><label htmlFor="auth-role-title">{campusRole === 'faculty' ? 'Faculty title (optional)' : 'Job title (optional)'}</label><input id="auth-role-title" value={roleTitle} onChange={event => setRoleTitle(event.target.value)} placeholder={campusRole === 'faculty' ? 'e.g. Lecturer or Professor' : 'e.g. Lab coordinator'} maxLength={80} autoComplete="organization-title" /></div>}
          </>}
          <div className="form-group"><label htmlFor="auth-username">Username</label><input id="auth-username" name="echobox-account-name" type="text" autoComplete={isLogin ? 'off' : 'username'} value={username} onChange={event => setUsername(event.target.value)} placeholder="Your campus alias" minLength={isLogin ? undefined : 3} maxLength={30} required />{!isLogin && <small className="auth-field-hint">This is the name shown on your comments.</small>}</div>
          <div className={!isLogin ? 'auth-fields-row' : ''}>
            <div className="form-group"><label htmlFor="auth-password">Password</label><div className="password-control"><input id="auth-password" name={isLogin ? 'echobox-login-secret' : 'new-password'} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder={isLogin ? 'Enter your password' : 'At least 8 characters'} minLength={isLogin ? undefined : 8} maxLength={128} required /><button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Hide' : 'Show'}</button></div>{!isLogin && <small className="auth-field-hint">Use at least 8 characters.</small>}</div>
            {!isLogin && <div className="form-group"><label htmlFor="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Enter it again" minLength={8} maxLength={128} required /></div>}
          </div>
          {!isLogin && <p className="auth-private-note">Your role and department help tailor the campus experience. They are not shown with your public feedback.</p>}
          <button type="submit" className="auth-btn" disabled={isSubmitting}>{isSubmitting ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}</button>
        </form>
        {isLogin && <p className="auth-privacy-note">You choose whether each post is anonymous, uses your campus alias, or shows your profile.</p>}
        <div className="auth-toggle-row"><span>{isLogin ? 'New to EchoBox?' : 'Already have an account?'}</span><button className="toggle-btn" type="button" onClick={toggleMode}>{isLogin ? 'Create an account' : 'Sign in'}</button></div>
      </section>
    </div>
  </main>;
}
