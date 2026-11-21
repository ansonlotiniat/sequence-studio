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

export function visualFormat(value) {
  if (value === 0) return '0';
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e7) return value.toExponential(3);
  return Number(value.toPrecision(7)).toLocaleString('zh-Hant', { maximumSignificantDigits: 7 });
}

export function chartDomain(values) {
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  if (min === max) return [-1, 1];
  const margin = (max - min) * 0.12;
  return [min - margin, max + margin];
}
