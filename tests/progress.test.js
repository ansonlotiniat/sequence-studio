import test from 'node:test';
import assert from 'node:assert/strict';
import { day, fromHash, nextPractice, practiceItem, readStudy, recordPractice, startPractice, storageKey, submitPractice } from '../src/learning/progress.js';
import { skills } from '../src/assessment.js';
import { defaults } from '../src/math.js';

test('classifies assisted work differently from unseen independent answers', () => {
  const id = 'square';
  const practice = startPractice(id);
  const correct = { ...practice, draft: String(practiceItem(id, practice).answer) };
  assert.deepEqual(submitPractice(id, { ...correct, revealed: true }), { ...correct, revealed: true });
  const assisted = submitPractice(id, { ...correct, hintLevel: 1 });
  assert.deepEqual(assisted.independent, []);
  assert.deepEqual(assisted.practiced, [0]);
  const afterMistake = submitPractice(id, { ...correct, attempts: 1 });
  assert.deepEqual(afterMistake.independent, []);
  const alternate = nextPractice(id, assisted, true);
  assert.equal(alternate.skill, practice.skill);
  assert.equal(alternate.draft, '');
  assert.notEqual(practiceItem(id, alternate).prompt, practiceItem(id, practice).prompt);
  assert.deepEqual(submitPractice(id, { ...alternate, draft: String(practiceItem(id, alternate).answer) }).independent, [0]);
});

test('pass needs independent evidence at every skill and schedules review', () => {
  const id = 'arithmetic';
  let chapter = {};
  let practice = startPractice(id);
  for (const [i] of skills[id].entries()) {
    practice = submitPractice(id, { ...practice, draft: String(practiceItem(id, practice).answer) });
    practice = nextPractice(id, practice);
    chapter = recordPractice(chapter, practice, 100);
    assert.equal(Boolean(chapter.passedAt), i === skills[id].length - 1);
  }
  assert.equal(chapter.reviewAt, 100 + day);
  const review = startPractice(id, defaults, chapter.practice);
  assert.notEqual(practiceItem(id, review).id, practiceItem(id, practice).id);
  const resumed = recordPractice(chapter, review, 200);
  assert.equal(recordPractice(resumed, { ...review, finished: true }, 200).reviewAt, 200 + 3 * day);
});

test('stored draft, scenario and valid chapter URL resume; old progress is exploration only', () => {
  const id = 'annuity';
  const practice = { ...startPractice(id, { ...defaults, due: true }), draft: '58' };
  const saved = { version: 1, chapters: { annuity: { practice } }, experiments: {}, location: { id, page: 'quiz' } };
  const stored = { getItem: key => key === storageKey ? JSON.stringify(saved) : null };
  assert.deepEqual(readStudy(stored), saved);
  assert.deepEqual(fromHash('#/annuity/quiz'), saved.location);
  assert.equal(fromHash('#/unknown/quiz'), null);
  assert.equal(fromHash('#/annuity/quiz/extra'), null);
  const legacy = { getItem: key => key === 'sequence-progress' ? '["square","other"]' : null };
  assert.deepEqual(readStudy(legacy).chapters, { square: { explored: true } });
});
