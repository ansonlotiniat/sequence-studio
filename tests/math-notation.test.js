import test from 'node:test';
import assert from 'node:assert/strict';
import { mathNotation } from '../src/visualizations/mathNotation.js';

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
