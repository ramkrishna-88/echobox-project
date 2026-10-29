const REPORT_REASONS = ['spam', 'harassment', 'personal-information', 'misinformation', 'other'];
const CATEGORIES = ['Student Life', 'Teacher', 'Event', 'Facility'];
const CAMPUS_ROLES = ['student', 'faculty', 'staff'];
const STUDY_YEARS = ['1', '2', '3', '4', 'postgraduate'];
const POST_TYPES = ['feedback', 'idea', 'discussion', 'moment', 'poll'];
const POST_TOPICS = ['Study life', 'Clubs', 'Food', 'Events', 'Wellbeing', 'Campus life'];
const POST_VISIBILITIES = ['anonymous', 'alias', 'named'];

function validateFeedback(tag, content) {
  if (!CATEGORIES.includes(tag)) return 'Choose a valid feedback category.';
  if (!content || content.length > 5000) return 'Feedback must be between 1 and 5,000 characters.';
  return null;
}

function validatePost(tag, content, postType = 'feedback', topics = [], visibility = 'anonymous', poll = null) {
  const feedbackError = validateFeedback(tag, content);
  if (feedbackError) return feedbackError.replace('feedback category', 'category');
  if (!POST_TYPES.includes(postType)) return 'Choose a valid post type.';
  if (!POST_VISIBILITIES.includes(visibility)) return 'Choose a valid post visibility.';
  if (!Array.isArray(topics) || topics.length > 3 || topics.some(topic => !POST_TOPICS.includes(topic))) return 'Choose up to 3 valid topics.';
  if (poll && !['idea', 'poll'].includes(postType)) return 'Polls can only be added to ideas or created as a poll post.';
  if (poll) {
    if (typeof poll.question !== 'string' || !poll.question.trim() || poll.question.trim().length > 200) return 'Enter a poll question up to 200 characters.';
    if (!Array.isArray(poll.options) || poll.options.length < 2 || poll.options.length > 5 || poll.options.some(option => typeof option !== 'string' || !option.trim() || option.trim().length > 100)) return 'A poll needs 2 to 5 options, each up to 100 characters.';
    const normalized = poll.options.map(option => option.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) return 'Poll options must be unique.';
  }
  if (postType === 'poll' && !poll) return 'A poll post needs a question and at least two options.';
  return null;
}

function validateReport(reason, details = '') {
  if (!REPORT_REASONS.includes(reason)) return 'Choose a report reason.';
  if (typeof details !== 'string' || details.trim().length > 500) return 'Report details must be 500 characters or fewer.';
  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return 'Password must be between 8 and 128 characters.';
  return null;
}

function validateCampusDetails(campusRole, department, studyYear, roleTitle = '') {
  if (!CAMPUS_ROLES.includes(campusRole)) return 'Choose a valid campus role.';
  if (typeof department !== 'string' || department.trim().length < 2 || department.trim().length > 80) return 'Enter a department or program between 2 and 80 characters.';
  if (campusRole === 'student' && !STUDY_YEARS.includes(studyYear)) return 'Choose your current academic year.';
  if (campusRole !== 'student' && studyYear) return 'Academic year is only required for students.';
  if (typeof roleTitle !== 'string' || roleTitle.trim().length > 80) return 'Role title must be 80 characters or fewer.';
  if (campusRole === 'student' && roleTitle.trim()) return 'Role title is only used for faculty and staff.';
  return null;
}

module.exports = { CATEGORIES, REPORT_REASONS, CAMPUS_ROLES, STUDY_YEARS, POST_TYPES, POST_TOPICS, POST_VISIBILITIES, validateFeedback, validatePost, validateReport, validatePassword, validateCampusDetails };
