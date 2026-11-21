import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, powerSums, recurrence } from '../src/math.js';
import { workedComputation } from '../src/learning/worked.js';

test('power formulas match direct sums and the square pyramid has three complete layers', () => {
  for (let n = 1; n <= 12; n++) {
    const values = Array.from({ length: n }, (_, i) => i + 1);
    const sum = power => values.reduce((total, k) => total + k ** power, 0);
    assert.deepEqual(powerSums(n), { linear: sum(1), square: sum(2), cube: sum(3) });
  }
  const steps = workedComputation('square', { n: 3 }).join(' ');
  assert.match(steps, /3×3 = 9/);
  assert.match(steps, /1 \+ 4 \+ 9 = 14/);
  assert.match(steps, /\(6\)² = 36/);
});

test('custom arithmetic and triangular workbooks support exact and impossible inverse cases', () => {
  const arithmetic = input => workedComputation('arithmetic', input).at(-1);
  assert.match(arithmetic({ a: -0.3, d: 0.1, n: 4, target: 0 }), /是第 4 項/);
  assert.match(arithmetic({ a: 7, d: -2, n: 6, target: 4 }), /沒有可驗證的正整數位置/);
  assert.match(arithmetic({ a: 7, d: 0, n: 6, target: 7 }), /每個位置都符合/);
  assert.match(arithmetic({ a: 7, d: 0, n: 6, target: 8 }), /沒有任何位置符合/);
  assert.match(workedComputation('triangular', { n: 4, target: 15 }).at(-1), /恰有 5 層/);
  assert.match(workedComputation('triangular', { n: 4, target: 14 }).at(-1), /不能排成完整三角形/);
});

test('custom geometric calculations distinguish terms, partial sums and limits', () => {
  const step = (r, a = 6) => workedComputation('geometric', { a, r, n: 3 }).at(-1);
  assert.match(step(-0.5), /≈ 4.*≈ -0\.5/);
  assert.match(step(-1), /不收斂/);
  assert.match(step(1, 0), /一直是零/);
  assert.match(workedComputation('geometric', { a: 6, r: 0, n: 1 })[0], /直接是 6/);
});

test('custom recurrence preserves the initial conditions and subtracts the second term', () => {
  assert.deepEqual(recurrence(2, 3, 5), { values: [2, 3, 5, 8, 13], next: 34, sum: 31 });
  assert.deepEqual(recurrence(-2, 3, 1), { values: [-2], next: 1, sum: -2 });
  assert.match(workedComputation('fibonacci', { n: 5, first: 2, second: 3 }).join(' '), /34−\(3\)＝31/);
});

test('geometric walkthrough keeps a near-unit ratio distinct from one in substitutions', () => {
  for (const r of [1 - Number.EPSILON / 2, 1 + Number.EPSILON]) {
    const steps = workedComputation('geometric', { a: 1, r, n: 3 });
    assert.ok(steps.at(-2).includes(`÷[1−(${r})]`));
    if (r < 1) assert.ok(steps.at(-1).includes(`÷[1−(${r})]`));
  }
});

test('custom annuity uses the chosen timing and can invert the target or handle zero interest', () => {
  const input = { ...defaults, n: 2, rate: 10, payment: 1000, target: 2310 };
  const due = workedComputation('annuity', { ...input, due: true }).join(' ');
  assert.match(due, /t=0.*2−0=2 年/);
  assert.match(due, /終值 ≈ MOP 2310；減去本金 MOP 2000，利息 ≈ MOP 310/);
  assert.match(due, /目標÷終值係數 ≈ MOP 1000/);
  assert.match(workedComputation('annuity', input)[2], /t=2.*2−2=0 年/);
  assert.match(workedComputation('annuity', { ...input, rate: 0 }).join(' '), /終值＝2×1000＝MOP 2000，利息為零/);
});
