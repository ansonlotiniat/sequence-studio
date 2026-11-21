const digits = '0123456789-';
const lowered = '₀₁₂₃₄₅₆₇₈₉₋';
const raised = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻';
export const subscript = value => String(value).replace(/[0-9-]/g, char => lowered[digits.indexOf(char)]);
export const superscript = value => String(value).replace(/[0-9-]/g, char => raised[digits.indexOf(char)]);

// Presentation only: recognize the legacy integer indices/powers, not a math parser.
export function mathNotation(text) {
  return text.replace(/\^(-?\d+)/g, (_, power) => superscript(power))
    .replace(/([aSFTQ])(\d+)/g, (_, symbol, index) => symbol + subscript(index));
}
