import { arithmeticPairTotal, arithmeticPartialSum, calculate } from '../math.js';

// Geometry uses fixed unit coordinates; changing n never changes the unit size.
export function squareTiles(n) {
  return Array.from({ length: n * n }, (_, i) => ({
    row: Math.floor(i / n), col: i % n,
    ring: Math.floor(i / n) === n - 1 || i % n === n - 1,
  }));
}

export function triangleCopies(n, adjacent = false) {
  const size = adjacent ? n - 1 : n;
  const original = [], copy = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) original.push({ row, col });
  }
  for (let row = 0; row < size; row++) {
    for (let col = 0; col <= row; col++) copy.push({
      row, col, pairedRow: size - 1 - row, pairedCol: (adjacent ? n - 1 : n) - col,
    });
  }
  return { original, copy, columns: adjacent ? n : n + 1 };
}

export function shiftedTerms(values, ratio) {
  return Array.from({ length: values.length + 1 }, (_, index) => ({
    original: index < values.length ? values[index] : 0,
    shifted: index > 0 ? values[index - 1] * ratio : 0,
    // Interior terms are the same symbolic term, even with floating-point inputs.
    difference: index === 0 ? values[0] : index === values.length ? -values.at(-1) * ratio : 0,
  }));
}

// Evaluate the tail itself: subtracting nearly equal floating-point sums loses it.
export function geometricTail(a, r, k) {
  if (a === 0) return 0;
  return Math.abs(r) < 1 ? a * r ** k / (1 - r) : null;
}

export function visualFormat(value) {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e7) return value.toExponential(3);
  return Number(value.toPrecision(7)).toLocaleString('zh-Hant', { maximumSignificantDigits: 7 });
}

export function proofNumber(value, operandScale = 0) {
  if (value === 0 || (operandScale > 0 && Math.abs(value) / operandScale < 1e-12)) return 0;
  return Number(value.toPrecision(10));
}

export function proofFormat(value) {
  const number = proofNumber(value);
  return number !== 0 && (Math.abs(number) < 0.001 || Math.abs(number) >= 1e10)
    ? String(number) : number.toLocaleString('zh-Hant', { maximumSignificantDigits: 10 });
}

export function proofPartialSums(values) {
  let sum = 0, scale = 0;
  return values.map(value => {
    sum += value;
    scale += Math.abs(value);
    return proofNumber(sum, scale);
  });
}

// Presentation uses the displayed operands; the calculator and input state stay unchanged.
export function proofCalculation(id, calculation) {
  if (id !== 'arithmetic' && id !== 'geometric') return calculation;
  const p = calculation.params;
  const display = calculate(id, { ...p, a: proofNumber(p.a), d: proofNumber(p.d), r: proofNumber(p.r) });
  const { a, d } = display.params;
  const values = display.values.map((value, i) => id === 'arithmetic' ? proofNumber(value, Math.abs(a) + Math.abs(i * d)) : value);
  const pairs = id === 'arithmetic' ? values.map((_, i) => proofNumber(arithmeticPairTotal(a, d, i + 1), Math.abs(2 * a) + Math.abs(i * d))) : [];
  const partialSums = id === 'arithmetic' ? values.map((_, i) => pairs[i] === 0 ? 0 : proofNumber(arithmeticPartialSum(a, d, i + 1))) : proofPartialSums(values);
  const sum = partialSums.at(-1);
  return { ...display, values, last: values.at(-1), sum, partialSums,
    pairTotal: id === 'arithmetic' ? pairs.at(-1) : null,
    doubleSum: proofNumber(arithmeticPairTotal(sum, 0, 1)),
  };
}

export function formatIndex(index, script = 'subscript') {
  if (!Number.isSafeInteger(index) || index < 0) throw new RangeError('Index must be a nonnegative safe integer');
  const digits = script === 'superscript' ? '⁰¹²³⁴⁵⁶⁷⁸⁹' : '₀₁₂₃₄₅₆₇₈₉';
  return String(index).replace(/\d/g, digit => digits[Number(digit)]);
}

export function chartDomain(values) {
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  if (min === max) return [-1, 1];
  const margin = (max - min) * 0.12;
  return [min - margin, max + margin];
}

export function arithmeticPicture(values, first, height = values[0] + values.at(-1)) {
  const positive = values.every(v => v > 0);
  const unitBlocks = positive && values.every(Number.isInteger);
  const cells = [];
  if (unitBlocks) values.forEach((value, col) => {
    for (let row = 0; row < value; row++) {
      cells.push({ copy: 0, col, row, sourceCol: col, sourceRow: row, base: row < first });
      cells.push({ copy: 1, col: values.length - col - 1, row: height - row - 1,
        sourceCol: col, sourceRow: row, base: row < first });
    }
  });
  return { height, positive, unitBlocks, cells };
}

export function geometricAreas(n, ratio) {
  if (!(ratio > 0 && ratio < 1)) return { pieces: [], remaining: null };
  const pieces = [];
  let x = 0, y = 0, width = 1, height = 1;
  for (let k = 0; k < n; k++) {
    if (k % 2 === 0) {
      const cut = width * (1 - ratio);
      pieces.push({ k: k + 1, x, y, width: cut, height });
      x += cut; width *= ratio;
    } else {
      const cut = height * (1 - ratio);
      pieces.push({ k: k + 1, x, y, width, height: cut });
      y += cut; height *= ratio;
    }
  }
  return { pieces, remaining: { x, y, width, height } };
}

export function signedLogScale(values) {
  const logs = values.filter(v => v !== 0).map(v => Math.log10(Math.abs(v)));
  const origin = logs.length ? Math.floor(Math.min(...logs)) : 0;
  return { origin, map: value => value === 0 ? 0 : Math.sign(value) * (Math.log10(Math.abs(value)) - origin + 1) };
}

export function cancellationBlocks(values, ratio) {
  return [
    ...values.map((value, col) => ({ row: 0, col, value, cancels: col > 0 })),
    ...values.map((value, i) => ({ row: 1, col: i + 1, value: value * ratio, cancels: i < values.length - 1 })),
  ];
}

export function squareSumCells(terms, columns = 10) {
  const cells = [];
  for (const term of [...new Set(terms)].sort((a, b) => a - b)) {
    for (let unit = 0; unit < term * term; unit++) {
      cells.push({ term, unit, row: Math.floor(cells.length / columns), col: cells.length % columns });
    }
  }
  return cells;
}

// Give each unit square height 1. Larger square layers go underneath smaller ones.
// Half-unit offsets center layers; no cube is duplicated or stretched.
export function squareSumTower(terms) {
  const layers = [...new Set(terms)].sort((a, b) => b - a);
  const size = layers[0] ?? 0;
  return layers.flatMap((term, z) => Array.from({ length: term * term }, (_, unit) => ({
    term, unit, z, x: unit % term + (size - term) / 2,
    y: Math.floor(unit / term) + (size - term) / 2,
  })));
}

// A year is a cash-flow operation, not a deposit's terminal-value index.
export function annuityLedger(payment, rate, n, due) {
  const rows = [{ year: 0, opening: 0, interest: 0, balance: 0 }];
  for (let year = 1; year <= n; year++) {
    const opening = rows.at(-1).balance;
    const interest = (opening + (due ? payment : 0)) * rate;
    rows.push({ year, opening, interest, balance: opening + payment + interest });
  }
  return rows;
}
