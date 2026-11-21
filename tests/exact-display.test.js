import test from 'node:test';
import assert from 'node:assert/strict';
import { exactDecimal as exact, displayRelation as relation, exactArithmeticSum } from '../src/learning/exactDisplay.js';
import { workedComputation as worked } from '../src/learning/worked.js';
import { calculate } from '../src/math.js';
import { proofCalculation, proofFormat } from '../src/visualizations/proofModels.js';

test('equality compares decimal values exactly, not binary noise, digit count or an epsilon', () => {
  assert.equal(relation(exact(0.1).plus(exact(0.2)), '0.3'), '=');
  assert.equal(relation(exact(1).dividedBy(exact(3)), '0.3333333333'), '≈');
  assert.equal(relation(exact('1e-15'), '0'), '≈');
  assert.equal(relation(exact(1).plus(exact('1e-15')), '1'), '≈');
  assert.equal(relation(exact('1e12'), '1000000000000'), '=');
  assert.equal(relation(exact('1000000000001'), '1e12'), '≈');
  assert.equal(relation(exact(-1250), '-1,250'), '=');
  assert.equal(relation(exact('3e-300').times(exact('1e-20')), '3e-320'), '=');
  assert.equal(relation(null, 'NaN'), '≈');
});

test('a rounded displayed operand cannot silently form an exact equation', () => {
  assert.equal(relation(exact(0.1), '0.1', exact(0.100000000001)), '≈');
  const steps = worked('arithmetic', { a: 0.123456789012, d: 0.2, n: 5, target: 31 });
  assert.match(steps[0], /aₙ ≈ .*≈ 0\.923456789/);
  assert.match(steps[2], /Sₙ ≈ .*≈ 2\.617283945/);
});

test('geometric exact term, addition and finite sum use equality', () => {
  const steps = worked('geometric', { a: 2, r: 2, n: 5 });
  assert.equal(steps[0], '共乘 4 次：aₙ = 2×(2)⁴ = 32。');
  assert.equal(steps[1], '把各項相加：2 + 4 + 8 + 16 + 32 = 62。');
  assert.match(steps[2], / = 62。$/);
  assert.match(worked('geometric', { a: 6, r: -0.5, n: 3 })[3], / = 4；.* = -0\.5/);
});

test('terminating geometric powers remain exact beside rounded finite/infinite sums and tails', () => {
  const steps = worked('geometric', { a: 1, r: 0.3, n: 12 });
  assert.match(steps[0], / = 0\.00000177147。$/);
  assert.match(steps[1], / ≈ 1\.428570669。$/);
  assert.match(steps[2], / ≈ 1\.428570669。$/);
  assert.match(steps[3], / ≈ 1\.428571429；.* ≈ 7\.592014286e-7/);
});

test('negative, zero and unit ratios retain their mathematical special cases', () => {
  for (const r of [-2, -1, 0, 1, 2]) {
    const steps = worked('geometric', { a: 2, r, n: 5 });
    assert.doesNotMatch(steps.join(' '), /≈|NaN|Infinity/);
  }
  assert.match(worked('geometric', { a: 6, r: 0, n: 1 })[0], /直接是 6/);
  assert.match(worked('geometric', { a: 0, r: 1, n: 5 })[3], /一直是零/);
});

test('ordinary and due annuities distinguish exact decimal deposits, factors, interest and inverse', () => {
  for (const [due, target, factor, interest] of [[false, 3310, '3.31', 310], [true, 3641, '3.641', 641]]) {
    const steps = worked('annuity', { payment: 1000, rate: 10, n: 3, due, target });
    assert.doesNotMatch(steps.join(' '), /≈/);
    assert.ok(steps[4].includes(`係數 = ${factor}。總終值 = MOP ${target}；減去本金 MOP 3000，利息 = MOP ${interest}`));
    assert.match(steps[5], /係數 = MOP 1000/);
  }
  assert.match(worked('annuity', { payment: 1000, rate: 10, n: 3, due: false, target: 3000 })[3], /\(1\.1\)⁰ = MOP 1000/);
  assert.doesNotMatch(worked('annuity', { payment: 1000, rate: 0, n: 3, due: false, target: 3000 }).join(' '), /≈|NaN|Infinity/);
});

test('annuity genuinely rounded rows, factor, interest and inverse keep approximation', () => {
  const steps = worked('annuity', { payment: 1000, rate: 5, n: 12, due: false, target: 3000 });
  assert.match(steps[1], / ≈ MOP 1710\.339358/);
  assert.match(steps[7], / ≈ MOP 1276\.281563/);
  assert.match(steps[8], / = MOP 1215\.50625/);
  assert.match(steps[13], /係數 ≈ 15\.91712652。總終值 ≈ MOP 15917\.12652；.*利息 ≈ MOP 3917\.12652/);
  assert.match(steps[14], /係數 ≈ MOP 188\.4762301/);
});

test('arithmetic proof marks exact decimal sums equal and genuinely shortened sums approximate', () => {
  for (const [a, d, n, expected, sign] of [[0.1, 0.2, 5, '2.5', '='], [-0.3, 0.1, 4, '-0.6', '='], [0.1234567891, 0.1234567892, 12, '9.629629556', '≈']]) {
    const proof = proofCalculation('arithmetic', calculate('arithmetic', { a, d, n }));
    assert.equal(proofFormat(proof.sum), expected);
    assert.equal(relation(exactArithmeticSum(proof.sourceParams), proofFormat(proof.sum)), sign);
  }
});

test('proof display rounding cannot lose the original precision when choosing a relation', () => {
  for (const input of [{ a: 0.123456789012, d: 0, n: 5 }, { a: 1, d: -1.9999999999999998, n: 2 }]) {
    const original = calculate('arithmetic', input), proof = proofCalculation('arithmetic', original);
    assert.equal(proof.sourceParams, original.params);
    assert.equal(relation(exactArithmeticSum(proof.params), proofFormat(proof.sum)), '=');
    assert.equal(relation(exactArithmeticSum(proof.sourceParams), proofFormat(proof.sum)), '≈');
  }
});

test('arithmetic inverse substitutions compare displayed operands to the original position', () => {
  assert.match(worked('arithmetic', { a: 0.123456789012, d: 0.2, n: 5, target: 31 })[3], /位置 ≈ 1 \+ /);
  assert.match(worked('arithmetic', { a: 0.1, d: 0.2, n: 5, target: 0.9 })[3], /位置 = 1 \+ /);
  const proof = proofCalculation('arithmetic', calculate('arithmetic', { a: 1, d: -1.9999999999999998, n: 2 }));
  assert.equal(relation(exact(proof.sourceParams.d), proofFormat(proof.params.d)), '≈');
});

test('zero-rate annuity keeps its final equality only when the principal display is exact', () => {
  assert.match(worked('annuity', { payment: 1000, rate: 0, n: 3 })[4], /終值＝3×1000＝MOP 3000/);
  assert.match(worked('annuity', { payment: 0.123456789012, rate: 0, n: 5 })[6], /終值＝5×0\.123456789012≈MOP 0\.6172839451/);
});
