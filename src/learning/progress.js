import { grade, makeItem, skills } from '../assessment.js';
import { defaults, normalize } from '../math.js';

export const storageKey = 'sequence-study-v1';
export const day = 24 * 60 * 60 * 1000;
export const firstLocation = { id: 'square', page: 'learn' };
const pages = ['learn', 'lab', 'quiz', 'path'];
const empty = { version: 1, location: firstLocation, chapters: {}, experiments: {} };

const validLocation = value =>
  value && Object.hasOwn(skills, value.id) && pages.includes(value.page);

export function fromHash(hash) {
  const [id, page, extra] = hash.replace(/^#\/?/, '').split('/');
  const value = { id, page };
  return !extra && validLocation(value) ? value : null;
}

export function readStudy(storage) {
  if (!storage) return empty;
  try {
    const stored = JSON.parse(storage.getItem(storageKey));
    if (stored?.version === 1 && stored.chapters && stored.experiments && validLocation(stored.location)) return stored;
    const legacy = JSON.parse(storage.getItem('sequence-progress') || '[]');
    if (Array.isArray(legacy)) {
      return { ...empty, chapters: Object.fromEntries(legacy.filter(id => Object.hasOwn(skills, id)).map(id => [id, { explored: true }])) };
    }
  } catch { return empty; }
  return empty;
}

const newQuestion = () => ({ draft: '', attempts: 0, hintLevel: 0, revealed: false, feedback: null });

export function startPractice(id, params = defaults, previous = null) {
  return {
    params: normalize(params), skill: 0, variants: skills[id].map((_, i) => previous ? previous.variants[i] + 1 : 0),
    independent: [], practiced: [], finished: false, ...newQuestion(),
  };
}

export const practiceItem = (id, practice) =>
  makeItem(id, practice.skill, practice.variants[practice.skill], practice.params);

export function submitPractice(id, practice) {
  if (practice.finished || practice.feedback?.status === 'correct' || practice.revealed) return practice;
  const feedback = grade(practiceItem(id, practice), practice.draft);
  if (feedback.status === 'invalid') return { ...practice, feedback };
  const independent = feedback.status === 'correct' && !practice.attempts && !practice.hintLevel;
  return {
    ...practice, attempts: practice.attempts + 1, feedback,
    independent: independent ? [...new Set([...practice.independent, practice.skill])] : practice.independent,
    practiced: feedback.status === 'correct' ? [...new Set([...practice.practiced, practice.skill])] : practice.practiced,
  };
}

export function nextPractice(id, practice, retry = false) {
  if (!retry && practice.independent.length === skills[id].length) return { ...practice, finished: true };
  const count = skills[id].length;
  const skill = retry ? practice.skill : Array.from({ length: count }, (_, i) => (practice.skill + i + 1) % count)
    .find(i => !practice.independent.includes(i));
  if (skill === undefined) return { ...practice, finished: true };
  const variants = practice.variants.map((variant, i) => i === practice.skill ? variant + 1 : variant);
  return { ...practice, skill, variants, ...newQuestion() };
}

export function recordPractice(chapter, practice, now = Date.now()) {
  const justFinished = practice.finished && !chapter.practice?.finished;
  return {
    ...chapter, explored: true, practice,
    ...(justFinished ? { passedAt: now, reviewAt: now + (chapter.passedAt ? 3 : 1) * day } : {}),
  };
}
