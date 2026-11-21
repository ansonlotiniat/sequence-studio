import test from 'node:test';
import assert from 'node:assert/strict';
import { grade, makeItem, readNumber, skills } from '../src/assessment.js';
import { calculate, defaults } from '../src/math.js';

test('annuity transfer questions grade present value, monthly repayment and principal separately', () => {
  const ordinary = makeItem('annuity', 5, 0);
  const due = makeItem('annuity', 5, 1);
  assert.equal(grade(ordinary, '210').status, 'correct');
  assert.match(grade(ordinary, '231').feedback, /時點/);
  assert.equal(grade(due, '462').status, 'correct');
  assert.match(grade(due, '484').feedback, /折現/);
  const repayment = makeItem('annuity', 6, 0);
  assert.equal(grade(repayment, '10201').status, 'correct');
  assert.match(grade(repayment, '10050').feedback, /平分/);
  const breakdown = makeItem('annuity', 7, 0);
  assert.equal(grade(breakdown, '10000').status, 'correct');
  assert.match(grade(breakdown, '201').feedback, /利息/);
});

test('annuity prompt, worked timings and grade use the same snapshot', () => {
  for (const due of [false, true]) for (const n of [1, 5, 12]) for (const rate of [0, 5]) {
    const params = { ...defaults, due, n, rate };
    const expected = Math.round(calculate('annuity', params).sum);
    const item = makeItem('annuity', 0, 0, params);
    params.due = !due;
    assert.match(item.prompt, due ? /每年期初/ : /每年期末/);
    assert.match(item.steps[0], new RegExp(`第一筆生息 ${n - 1 + Number(due)} 年，最後一筆生息 ${Number(due)} 年`));
    assert.equal(item.scenario.due, due);
    assert.equal(item.answer, expected);
    assert.equal(grade(item, String(expected)).status, 'correct');
    const other = Math.round(calculate('annuity', params).sum);
    if (other !== expected) assert.match(grade(item, String(other)).feedback, /另一種存款時點/);
  }
  const variant = makeItem('annuity', 0, 1, { ...defaults, due: true });
  assert.equal(variant.scenario.due, false);
  assert.equal(variant.answer, Math.round(calculate('annuity', variant.scenario).sum));
});

test('annuity rounds a half-dollar up and shows the same result in its solution', () => {
  const params = { n: 1, due: true, payment: 100, rate: 0.5 };
  const item = makeItem('annuity', 0, 0, params);
  assert.equal(item.answer, 101);
  assert.equal(grade(item, '101').status, 'correct');
  assert.match(grade(item, '100').feedback, /另一種存款時點/);
  assert.match(item.steps.at(-1), /MOP 100\.5 → MOP 101/);

  const ordinary = makeItem('annuity', 0, 0, { ...params, due: false });
  assert.match(grade(ordinary, '101').feedback, /另一種存款時點/);
  const belowHalf = makeItem('annuity', 0, 0, { ...params, rate: 0.4999999 });
  assert.equal(belowHalf.answer, 100);
  assert.match(belowHalf.steps.at(-1), /MOP 100\.499999\d* → MOP 100/);
});

test('live starting parameters are snapshotted and n=12 does not expose the target', () => {
  assert.equal(makeItem('square', 0, 0).answer, 14);
  const params = { ...defaults, a: 3, r: -1, n: 12 };
  const item = makeItem('geometric', 0, 0, params);
  params.r = 2;
  assert.match(item.prompt, /第 13 項/);
  assert.deepEqual(item.scenario, { n: 13, a: 3, r: -1 });
  assert.equal(item.answer, 3);
  assert.equal(makeItem('geometric', 0, 0, { ...defaults, a: 3, r: -1 }).answer, -3);
});

test('explicit grading distinguishes nonzero, integer, and input format', () => {
  const small = makeItem('geometric', 0, 0, { ...defaults, r: 0.1 });
  assert.equal(small.answer, 0.00002);
  assert.equal(grade(small, '0').status, 'retry');
  assert.equal(grade(small, '2e-5').status, 'correct');
  const fractional = makeItem('arithmetic', 0, 0, { ...defaults, d: 0.5 });
  assert.equal(grade(fractional, '９／２').status, 'correct');
  assert.equal(grade(fractional, '４．５').status, 'correct');
  assert.equal(grade(fractional, '4.5009').status, 'retry');
  for (const raw of ['', ' ', '4/0', '1e999', '2e-999', '3/2/1', '4+0.5', '0x4', 'NaN', 'MOP 4.5']) {
    assert.equal(readNumber(raw), null, raw);
    assert.equal(grade(fractional, raw).status, 'invalid', raw);
  }
});

test('significant-digit grading accepts exact fractions and rounded answers', () => {
  const item = makeItem('geometric', 0, 0, { n: 12, a: 1, r: 0.5 });
  assert.equal(item.answer, 0.00024414063);
  assert.equal(grade(item, '1/4096').status, 'correct');
  assert.equal(grade(item, '0.00024414063').status, 'correct');
  assert.equal(grade(item, '0.000244140624').status, 'correct');
  assert.equal(grade(item, '0.00024414064').status, 'retry');
  assert.equal(grade(item, '0').status, 'retry');
});

test('arithmetic diagnoses both an extra step and a noninteger position', () => {
  const item = makeItem('arithmetic', skills.arithmetic.indexOf('診斷步數與位置錯誤'), 0);
  assert.match(item.options[item.answer][0], /第 6 項是 -6.*5 步.*-7.*不在數列中/);
  const extraStep = item.options.findIndex(([text]) => text.includes('位置就是步數'));
  const rounding = item.options.findIndex(([text]) => text.includes('取最接近的整數'));
  assert.match(grade(item, String(extraStep)).feedback, /還沒有走任何一步/);
  assert.match(grade(item, String(rounding)).feedback, /只有正整數位置/);
});

test('each skill supplies distinct transfer prompts and diagnoses wrong choices', () => {
  for (const [id, labels] of Object.entries(skills)) for (const skill of labels.keys()) {
    const first = makeItem(id, skill, 0);
    const second = makeItem(id, skill, 1);
    assert.notEqual(first.id, second.id);
    assert.notDeepEqual([first.prompt, first.options], [second.prompt, second.options]);
    for (const item of [first, second]) {
      assert.equal(grade(item, String(item.answer)).status, 'correct');
      assert.ok(item.steps.length);
      assert.equal(item.hints.length, 2);
      if (item.options) for (const i of item.options.keys()) {
        if (i !== item.answer) assert.equal(grade(item, String(i)).status, 'retry');
      }
    }
  }
});

test('graded transfer tasks distinguish model quantities and handle exact decimal cancellation', () => {
  const transfer = [
    ['square', '36', '14', /一層正方形/],
    ['geometric', '4', '0', /項趨近 0/],
    ['triangular', '20', '10', /最大展品/],
    ['fibonacci', '31', '33', /第二項不是 1/],
    ['annuity', '155', '1155', /扣掉本金/],
  ];
  for (const [id, correct, confusion, feedback] of transfer) {
    const skill = id === 'annuity' ? skills[id].indexOf('分辨終值、本金與利息') : skills[id].length - 1;
    const item = makeItem(id, skill, 0);
    assert.equal(grade(item, correct).status, 'correct', id);
    assert.match(grade(item, confusion).feedback, feedback, id);
  }
  const cancellation = makeItem('arithmetic', 0, 0, { a: -0.3, d: 0.1, n: 3 });
  assert.equal(grade(cancellation, '0').status, 'correct');
});
