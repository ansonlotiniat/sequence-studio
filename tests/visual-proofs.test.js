import test from 'node:test';
import assert from 'node:assert/strict';
import { squareTiles, triangleCopies, shiftedTerms, geometricTail, visualFormat, chartDomain, arithmeticPicture, geometricAreas, signedLogScale, cancellationBlocks } from '../src/visualizations/proofModels.js';
import { arithmeticPairTotal, arithmeticPartialSum, calculate } from '../src/math.js';

test('arithmetic pictures tile the doubled-sum rectangle for positive integers', () => {
  for (let n = 1; n <= 12; n++) for (const [a, d] of [[2, 3], [3, 4], [20, -1], [1, 0]]) {
    const c = calculate('arithmetic', { n, a, d });
    const model = arithmeticPicture(c.values, a);
    assert.equal(model.unitBlocks, true);
    assert.equal(model.cells.length, 2 * c.sum);
    const cells = new Set(model.cells.map(cell => `${cell.col}:${cell.row}`));
    assert.equal(cells.size, model.cells.length);
    for (let col = 0; col < n; col++) for (let row = 0; row < model.height; row++) assert.ok(cells.has(`${col}:${row}`));
    for (const copy of [0, 1]) assert.equal(model.cells.filter(cell => cell.copy === copy).length, c.sum);
  }
});

test('arithmetic zero, negative and fractional terms never masquerade as unit cells', () => {
  for (const values of [[0], [-2, -1], [7, 5, 3, 1, -1], [0.5, 1.5]]) {
    const model = arithmeticPicture(values, values[0]);
    assert.equal(model.unitBlocks, false);
    assert.deepEqual(model.cells, []);
    assert.equal(model.positive, values.every(v => v > 0));
  }
});

test('alternating geometric cuts partition a square with the exact remaining tail area', () => {
  for (const ratio of [0.1, 0.5, 0.9]) for (let n = 0; n <= 12; n++) {
    const { pieces, remaining } = geometricAreas(n, ratio);
    const all = [...pieces, remaining];
    assert.ok(Math.abs(remaining.width * remaining.height - ratio ** n) < 1e-12);
    assert.ok(Math.abs(all.reduce((sum, p) => sum + p.width * p.height, 0) - 1) < 1e-12);
    pieces.forEach((p, i) => assert.ok(Math.abs(p.width * p.height - (1 - ratio) * ratio ** i) < 1e-12));
    for (const p of all) {
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.width <= 1 + 1e-12 && p.y + p.height <= 1 + 1e-12);
      for (const q of all) if (p !== q) assert.ok(Math.min(p.x + p.width, q.x + q.width) - Math.max(p.x, q.x) < 1e-12 || Math.min(p.y + p.height, q.y + q.height) - Math.max(p.y, q.y) < 1e-12);
    }
  }
  for (const ratio of [-1, 0, 1, 2]) assert.deepEqual(geometricAreas(3, ratio), { pieces: [], remaining: null });
});

test('shift pictures cancel only matching middle terms, including exceptional ratios', () => {
  for (const r of [-3, -0.5, 0, 0.5, 1, 3]) for (let n = 1; n <= 12; n++) {
    const c = calculate('geometric', { n, a: 2, r });
    const blocks = cancellationBlocks(c.values, r);
    assert.equal(blocks.filter(b => !b.cancels).length, 2);
    for (let col = 1; col < n; col++) {
      const pair = blocks.filter(b => b.col === col);
      assert.equal(pair.length, 2);
      assert.ok(Math.abs(pair[0].value - pair[1].value) < 1e-8);
      assert.ok(pair.every(b => b.cancels));
    }
  }
});

test('log distances preserve zero, sign and equal spacing for multiplicative magnitudes', () => {
  for (const values of [[0, 0], [0.0001, -0.01, 1, -100], [2, 4, 8, 16]]) {
    const scale = signedLogScale(values);
    values.forEach(v => { assert.equal(Math.sign(scale.map(v)), Math.sign(v)); assert.ok(Number.isFinite(scale.map(v))); });
  }
  const scale = signedLogScale([2, 4, 8]);
  assert.ok(Math.abs((scale.map(8) - scale.map(4)) - (scale.map(4) - scale.map(2))) < 1e-12);
});

test('square decomposition conserves area and counts its corner only once, including n=1', () => {
  for (let n = 1; n <= 12; n++) {
    const cells = squareTiles(n);
    assert.equal(cells.filter(c => c.ring).length, 2 * n - 1);
    assert.equal(cells.filter(c => !c.ring).length, (n - 1) ** 2);
    assert.equal(new Set(cells.map(c => `${c.row}:${c.col}`)).size, n * n);
  }
});

test('rotated copies tile the entire rectangle or square with no overlap or missing points', () => {
  for (let n = 1; n <= 12; n++) for (const adjacent of [false, true]) {
    const { original, copy, columns } = triangleCopies(n, adjacent);
    const occupied = new Set(original.map(p => `${p.row}:${p.col}`));
    assert.equal(original.length, n * (n + 1) / 2);
    assert.equal(copy.length, adjacent ? n * (n - 1) / 2 : original.length);
    for (const point of copy) {
      const key = `${point.pairedRow}:${point.pairedCol}`;
      assert.ok(!occupied.has(key), `overlap ${n} ${adjacent} ${key}`);
      occupied.add(key);
    }
    for (let row = 0; row < n; row++) for (let col = 0; col < columns; col++) assert.ok(occupied.has(`${row}:${col}`));
    assert.equal(occupied.size, n * columns);
  }
});

test('shift cancellation agrees with signed finite sums, including r=0, r=1 and zero first term', () => {
  for (const n of [1, 2, 12]) for (const a of [-20, 0, 2]) for (const r of [-3, -1, -0.5, 0, 0.2, 1, 3]) {
    const c = calculate('geometric', { n, a, r });
    const rows = shiftedTerms(c.values, r);
    const difference = rows.reduce((sum, cell) => sum + cell.difference, 0);
    assert.ok(Math.abs(difference - (1 - r) * c.sum) < 1e-7);
    assert.ok(rows.slice(1, -1).every(cell => cell.difference === 0));
  }
});

test('nonzero small values never display as exact zero; charts include zero without fake bar heights', () => {
  for (const value of [0.0000001, -0.000002, 2 * 0.1 ** 11]) {
    assert.notEqual(visualFormat(value), '0');
    assert.notEqual(Number(visualFormat(value)), 0);
  }
  assert.equal(visualFormat(0), '0');
  for (const values of [[0, 0], [-1, -5], [1, 5], [-3, 3]]) {
    const [min, max] = chartDomain(values);
    assert.ok(min < 0 && max > 0);
    assert.ok(values.every(v => v > min && v < max));
  }
});

test('geometric tail preserves small nonzero remainders and their alternating signs', () => {
  assert.ok(Math.abs(geometricTail(2, 0.01, 12) / (2e-24 / 0.99) - 1) < 1e-14);
  for (const r of [0.01, 0.1, -0.1, -0.5]) for (const k of [1, 2, 12]) {
    const tail = geometricTail(2, r, k);
    const next = 2 * r ** k;
    assert.equal(Math.sign(tail), Math.sign(next));
    assert.ok(Math.abs((tail - geometricTail(2, r, k + 1)) / next - 1) < 1e-14);
    assert.notEqual(visualFormat(tail), '0');
  }
  assert.equal(geometricTail(0, 3, 12), 0);
  assert.equal(geometricTail(2, 0, 12), 0);
  assert.equal(geometricTail(2, 1, 12), null);
});

test('decimal arithmetic pairs cancel consistently without erasing genuinely tiny sums', () => {
  assert.equal(arithmeticPairTotal(-0.3, 0.1, 7), 0);
  assert.equal(arithmeticPartialSum(-0.3, 0.1, 7), 0);
  assert.equal(arithmeticPairTotal(0.3, -0.1, 7), 0);
  const centered = calculate('arithmetic', { a: -0.3, d: 0.1, n: 7 });
  assert.equal(centered.values[3], 0);
  assert.equal(centered.sum, 0);
  assert.equal(centered.sum, arithmeticPartialSum(-0.3, 0.1, 7));
  assert.ok(Math.abs(arithmeticPartialSum(1e-20, 0, 12) / 12e-20 - 1) < 1e-14);
  for (const a of [-10, -0.3, 0, 0.2, 1e-20]) for (const d of [-1, -0.1, 0, 0.1, 3]) for (const n of [1, 7, 12]) {
    const expected = calculate('arithmetic', { a, d, n }).sum;
    assert.ok(Math.abs(arithmeticPartialSum(a, d, n) - expected) < 1e-12);
  }
  assert.ok(arithmeticPartialSum(-0.3, 0.10001, 7) > 0);
  // Deliberate near-cancellation is not a rounding error to erase.
  assert.equal(calculate('arithmetic', { a: 1, d: -0.9999999999999999, n: 2 }).values[1], 1e-16);
  assert.equal(calculate('arithmetic', { a: 1, d: -1.9999999999999998, n: 2 }).sum, 2e-16);
  assert.equal(calculate('arithmetic', { a: 5e-324, d: 0, n: 1 }).last, 5e-324);
});
