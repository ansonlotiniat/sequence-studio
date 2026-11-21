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

test('new skills reopen completed practice without discarding earned skill evidence', () => {
  const id = 'square', exam = startPractice(id);
  const saved = { version: 1, location: { id, page: 'quiz' }, experiments: {},
    chapters: { square: { explored: true, passedAt: 100, reviewAt: 200,
      practice: { ...exam, skill: 2, finished: true, variants: [1, 1, 0], independent: [0, 1, 2], practiced: [0, 1, 2] } } } };
  const chapter = readStudy({ getItem: () => JSON.stringify(saved) }).chapters.square;
  assert.equal(chapter.passedAt, undefined);
  assert.equal(chapter.practice.finished, false);
  assert.deepEqual(chapter.practice.independent, [0, 1, 2]);
  assert.equal(chapter.practice.skill, 3);
  assert.equal(practiceItem(id, chapter.practice).label, '解釋立方和的抵消');
});

test('an unfinished review keeps prior mastery separate from this review’s answers', () => {
  const id = 'square', exam = startPractice(id);
  const independent = exam.variants.map((_, i) => i);
  const passed = recordPractice({}, { ...exam, independent, finished: true }, 100);
  const review = startPractice(id, defaults, passed.practice);
  assert.deepEqual(review.mastered, independent);
  assert.deepEqual(review.independent, []);
  const chapter = recordPractice(passed, { ...review, independent: [0] }, 150);
  const saved = { version: 1, location: { id, page: 'quiz' }, experiments: {}, chapters: { square: chapter } };
  const load = () => readStudy({ getItem: () => JSON.stringify(saved) }).chapters.square;
  assert.deepEqual(load(), chapter);

  const { mastered, ...oldReview } = chapter.practice;
  saved.chapters.square = { ...chapter, practice: { ...oldReview, variants: [0, 0, 0] } };
  const expanded = load();
  assert.deepEqual(expanded.practice.mastered, [0, 1, 2]);
  assert.deepEqual(expanded.practice.independent, [0, 1, 2]);
  assert.equal(expanded.practice.skill, 3);
  assert.equal(expanded.passedAt, undefined);
});
