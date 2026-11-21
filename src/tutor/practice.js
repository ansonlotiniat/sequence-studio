import { grade, makeItem, skills } from '../assessment.js';

export function quizHelp(lesson, raw) {
  const { skill, variant, params, attempt, hintLevel, question = '' } = raw ?? {};
  if (!Number.isInteger(skill) || !skills[lesson]?.[skill] || !Number.isSafeInteger(variant) || variant < 0 ||
      typeof attempt !== 'string' || attempt.length > 64 || !Number.isInteger(hintLevel) || hintLevel < 0 ||
      typeof question !== 'string' || question.length > 500) throw new Error('invalid quiz');
  const item = makeItem(lesson, skill, variant, params);
  if (hintLevel > item.hints.length) throw new Error('invalid hint level');
  const result = grade(item, attempt);
  if (result.status !== 'retry') throw new Error('submit an incorrect attempt first');
  const choices = [{ key: 'revisit', text: result.feedback, level: hintLevel }];
  item.hints.slice(hintLevel).forEach((text, i) => {
    choices.push({ key: `hint${i + hintLevel + 1}`, text, level: i + hintLevel + 1 });
  });
  return {
    skill: item.label,
    prompt: item.prompt,
    attempt: item.options ? item.options[Number(attempt)][0] : attempt,
    question: question.trim(),
    choices,
  };
}
