import test from 'node:test';
import assert from 'node:assert/strict';
import { editSquareWorkspace, lessonStages, openLessonExperiment, updateGuidedStudy, visibleExperimentParams } from '../src/learning/guided.js';
import { readStudy, storageKey } from '../src/learning/progress.js';
import { teaching } from '../src/learning/content.js';
import { calculatedFacts, experimentContext } from '../src/tutor/context.js';

const restore = study => readStudy({ getItem: key => key === storageKey ? JSON.stringify(study) : null });
const experiment = { view: 'sum', params: { n: 3 } };
const completeSquare = { placed: [1, 2, 3], answers: { term: '9', sum: '14' }, checked: true, correct: true };

test('the tutor uses the guided square mission size, not the saved lab size', () => {
  const guided = openLessonExperiment({}, 'square', experiment);
  const labParams = { n: 4 };
  const context = (page, state = guided) =>
    experimentContext('square', page, visibleExperimentParams('square', page, state, labParams), state.view);
  const lesson = context('learn');
  assert.deepEqual(lesson.params, { n: 3 });
  assert.equal(calculatedFacts('square', lesson).sum, 14);
  assert.deepEqual(context('lab').params, { n: 4 });
  assert.equal(calculatedFacts('square', context('lab')).sum, 30);
  assert.deepEqual(context('learn', openLessonExperiment(guided, 'square', { view: 'shape', params: labParams })).params, { n: 4 });
  assert.deepEqual(context('learn', {}), { page: 'learn' });
});

test('guided answers, workbooks, and placements survive lab and quiz navigation per chapter', () => {
  let study = readStudy();
  for (const id of Object.keys(teaching)) {
    const worksheet = { draft: { n: '5' }, submitted: { n: 4 } };
    if (id === 'annuity') Object.assign(worksheet, {
      mode: 'loan', pv: { due: true, draft: { payment: '132' } },
      loan: { draft: { principal: '20100' }, submitted: { principal: 20100, periods: 2, percent: 12, due: false } },
    });
    study = updateGuidedStudy(study, id, guided => ({
      ...openLessonExperiment(guided, id, teaching[id].presets[0]),
      prediction: `${id} 的預測`, ready: teaching[id].readiness[2], worked: true, check: 'right',
      reviewed: true, exitOpen: true, worksheet,
      ...(id === 'square' && { square: completeSquare }),
    }));
    const saved = study.chapters[id].guided;
    for (const page of ['lab', 'quiz', 'learn']) {
      study = restore({ ...study, location: { id, page } });
      assert.deepEqual(study.chapters[id].guided, saved);
      assert.deepEqual(lessonStages(study.chapters[id].guided, id, teaching[id].readiness[2], 'right'),
        [true, true, true, true, true]);
    }
  }
  assert.equal(study.chapters.square.guided.prediction, 'square 的預測');
  assert.deepEqual(study.chapters.square.guided.square, completeSquare);
});

test('incorrect answers, removing a piece, and switching square missions withdraw only the affected credit', () => {
  const guided = { ...openLessonExperiment({}, 'square', experiment), ready: 1, worked: true,
    check: 'right', reviewed: true, square: completeSquare };
  const stages = state => lessonStages(state, 'square', 1, 'right');
  assert.deepEqual(stages({ ...guided, ready: 0, check: 'wrong' }), [false, true, true, false, true]);
  for (const square of [
    editSquareWorkspace(completeSquare, { answers: { term: '9', sum: '9' } }),
    editSquareWorkspace(completeSquare, { placed: [1, 2] }),
  ]) {
    assert.equal(square.checked, false);
    assert.deepEqual(stages({ ...guided, square }), [true, false, true, true, true]);
  }
  const alternate = openLessonExperiment(guided, 'square', { view: 'shape', params: { n: 4 } });
  assert.deepEqual(stages(alternate), [true, false, true, true, true]);
  const returned = openLessonExperiment(alternate, 'square', experiment);
  assert.deepEqual(returned.square.answers, completeSquare.answers);
  assert.deepEqual(stages(returned), [true, false, true, true, true]);
  assert.deepEqual(stages({ ...returned, square: completeSquare }), [true, true, true, true, true]);
});
