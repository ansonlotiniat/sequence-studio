// Presentation only: use the inputs' decimal values to decide whether a
// displayed result is exact. Never use an epsilon (which hides real rounding)
// or feed these fractions back into the calculator, answers or grading.
class Fraction {
  constructor(top, bottom = 1n) {
    if (bottom === 0n) throw new RangeError('Zero denominator');
    let a = top < 0n ? -top : top, b = bottom < 0n ? -bottom : bottom;
    while (b) [a, b] = [b, a % b];
    const divisor = (a || 1n) * (bottom < 0n ? -1n : 1n);
    this.top = top / divisor;
    this.bottom = bottom / divisor;
  }
  plus(other) { return new Fraction(this.top * other.bottom + other.top * this.bottom, this.bottom * other.bottom); }
  minus(other) { return this.plus(new Fraction(-other.top, other.bottom)); }
  times(other) { return new Fraction(this.top * other.top, this.bottom * other.bottom); }
  dividedBy(other) { return new Fraction(this.top * other.bottom, this.bottom * other.top); }
  power(exponent) { return new Fraction(this.top ** BigInt(exponent), this.bottom ** BigInt(exponent)); }
  equals(other) { return this.top === other.top && this.bottom === other.bottom; }
}

export function exactDecimal(value) {
  const text = String(value).replaceAll(',', '').toLowerCase();
  if (!/^[+-]?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/.test(text)) return null;
  const [mantissa, exponent = '0'] = text.split('e');
  const scale = (mantissa.split('.')[1]?.length ?? 0) - Number(exponent);
  const coefficient = BigInt(mantissa.replace('.', ''));
  return scale >= 0 ? new Fraction(coefficient, 10n ** BigInt(scale)) : new Fraction(coefficient * 10n ** BigInt(-scale));
}

export const exactSum = values => values.reduce((sum, value) => sum.plus(value), exactDecimal(0));

// Extra operands can describe an expression made from rounded display inputs.
// Both the result and that displayed expression must match before printing =.
export function displayRelation(exact, ...shown) {
  return exact && shown.every(value => {
    const fraction = value instanceof Fraction ? value : exactDecimal(value);
    return fraction && exact.equals(fraction);
  }) ? '=' : '≈';
}

export function exactArithmeticSum({ a, d, n }) {
  return exactDecimal(a).times(exactDecimal(n))
    .plus(exactDecimal(d).times(exactDecimal(n * (n - 1) / 2)));
}
