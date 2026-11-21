import test from 'node:test';
import assert from 'node:assert/strict';
import { mathNotation, subscript, superscript } from '../src/visualizations/mathNotation.js';
import { defaults } from '../src/math.js';
import { makeItem, skills } from '../src/assessment.js';
import { workedComputation } from '../src/learning/worked.js';

test('legacy proof indices remain distinct from the displayed values', () => {
  assert.equal(mathNotation('a2 − a1 = d；a₁ + a12；S3 = 4'), 'a₂ − a₁ = d；a₁ + a₁₂；S₃ = 4');
  assert.equal(mathNotation('2S12 = 12 × 34 = 408；S12 = 204'), '2S₁₂ = 12 × 34 = 408；S₁₂ = 204');
});

test('powers and indices support the full twelve-term proof without changing money or signs', () => {
  assert.equal(mathNotation('a₁r^12/(1−r)'), 'a₁r¹²/(1−r)');
  assert.equal(mathNotation('$1,000 × (1 + 10%)^2 = $1,210'), '$1,000 × (1 + 10%)² = $1,210');
  assert.equal(mathNotation('F14 − F2 = 377 − 1 = 376'), 'F₁₄ − F₂ = 377 − 1 = 376');
  assert.equal(mathNotation('MOP 100000；−0.5；S∞；10⁻⁸'), 'MOP 100000；−0.5；S∞；10⁻⁸');
});

test('dynamic indices and powers retain every digit, including zero and two-digit values', () => {
  assert.equal(subscript(4), '₄');
  assert.equal(subscript(12), '₁₂');
  assert.equal(superscript(0), '⁰');
  assert.equal(superscript(-12), '⁻¹²');
});

test('worked and practice powers preserve bases, exponents and computed results', () => {
  const geometric = workedComputation('geometric', { n: 5, a: 2, r: 2 });
  assert.match(geometric[0], /2×\(2\)⁴ = 32/);
  assert.match(geometric[2], /2×\[1−\(2\)⁵\]÷\[1−\(2\)\] = 62/);
  const annuity = workedComputation('annuity', { n: 3, payment: 1000, rate: 10, due: false, target: 3000 });
  assert.match(annuity[1], /1000×\(1\.1\)² = MOP 1210/);
  assert.match(annuity[3], /1000×\(1\.1\)⁰ = MOP 1000/);
  assert.match(annuity[4], /\[\(1\+0\.1\)³−1\].*終值 = MOP 3310/);
  assert.match(makeItem('geometric', 0, 0, { n: 5, a: 2, r: 2 }).steps[1], /2 × 2⁵ = 64/);
  assert.match(makeItem('geometric', 2, 0).steps[1], /2³.*= 14/);
});

test('all six lessons generate worked and practice text without caret powers or baseline indices', () => {
  const plainNotation = /\^|(?<![A-Za-z])[aSFTQ]\d/;
  function check(value) {
    if (typeof value === 'string') assert.doesNotMatch(value, plainNotation);
    else if (Array.isArray(value)) value.forEach(check);
    else if (value && typeof value === 'object') Object.values(value).forEach(check);
  }
  for (const [id, labels] of Object.entries(skills)) {
    for (const n of [1, 4, 10, 12]) for (const r of [-3, -1, -0.5, 0, 1, 2, 3]) {
      const params = { ...defaults, n, r, first: 2, second: 3, target: 100 };
      check(workedComputation(id, params));
      for (const skill of labels.keys()) for (let variant = 0; variant < 12; variant++) check(makeItem(id, skill, variant, params));
    }
  }
});
