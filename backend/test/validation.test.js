const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFeedback, validatePost, validateReport, validatePassword, validateCampusDetails } = require('../validation');

test('feedback validation accepts supported categories and non-empty content', () => {
  assert.equal(validateFeedback('Facility', 'Please repair the library printers.'), null);
});

test('feedback validation rejects unknown categories and excessive content', () => {
  assert.match(validateFeedback('Other', 'Text'), /valid feedback category/);
  assert.match(validateFeedback('Event', 'x'.repeat(5001)), /5,000 characters/);
});

test('post validation accepts community post types and an idea poll', () => {
  assert.equal(validatePost('Student Life', 'What should the cafe add?', 'idea', ['Food', 'Campus life'], 'alias', { question: 'Pick one', options: ['Soup', 'Salad'] }), null);
  assert.equal(validatePost('Event', 'That was a great night!', 'moment', ['Events'], 'named'), null);
  assert.equal(validatePost('Student Life', 'What should campus host?', 'poll', ['Events'], 'anonymous', { question: 'Choose an event', options: ['Movie night', 'Open mic'] }), null);
});

test('post validation rejects status-free post polls and invalid topics or visibility', () => {
  assert.match(validatePost('Student Life', 'Thoughts?', 'discussion', [], 'anonymous', { question: 'Vote', options: ['Yes', 'No'] }), /only be added to ideas or created as a poll post/);
  assert.match(validatePost('Student Life', 'Thoughts?', 'poll', [], 'anonymous'), /needs a question/);
  assert.match(validatePost('Student Life', 'Thoughts?', 'moment', ['Unknown'], 'anonymous'), /valid topics/);
  assert.match(validatePost('Student Life', 'Thoughts?', 'moment', [], 'public'), /visibility/);
});

test('report validation accepts allowed reasons and limits details to 500 characters', () => {
  assert.equal(validateReport('personal-information', 'A short explanation'), null);
  assert.match(validateReport('unknown', ''), /report reason/);
  assert.match(validateReport('spam', 'x'.repeat(501)), /500 characters/);
});

test('password validation enforces minimum and maximum lengths', () => {
  assert.equal(validatePassword('correct-horse'), null);
  assert.match(validatePassword('short'), /8 and 128/);
  assert.match(validatePassword('x'.repeat(129)), /8 and 128/);
});

test('campus registration details enforce a role, department, and student year', () => {
  assert.equal(validateCampusDetails('student', 'Computer Science', '2'), null);
  assert.match(validateCampusDetails('student', 'Computer Science', ''), /academic year/);
  assert.match(validateCampusDetails('visitor', 'Computer Science', ''), /campus role/);
  assert.match(validateCampusDetails('faculty', 'A', ''), /department or program/);
  assert.match(validateCampusDetails('staff', 'Facilities', '3'), /only required for students/);
});
