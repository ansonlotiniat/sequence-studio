import test from 'node:test';
import assert from 'node:assert/strict';
import { squareTiles, triangleCopies, shiftedTerms, visualFormat, chartDomain } from '../src/visualizations/proofModels.js';
import { calculate } from '../src/math.js';

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
