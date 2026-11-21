export const lessons = [
  { id: 'square', title: '平方數列', en: 'Square numbers', tag: '從形狀發現規律', symbol: 'n²', intro: '1、4、9、16……不只是一串數字。每一項，都能拼成一個更大的正方形。', formula: 'aₙ = n²', sum: 'Sₙ = n(n + 1)(2n + 1) / 6', question: '正方形每長大一圈，要多加幾塊？' },
  { id: 'arithmetic', title: '等差數列', en: 'Arithmetic sequences', tag: '每一步，一樣多', symbol: '+d', intro: '每次都加上同一個數。拖動首項與公差，看看數列如何在座標平面排成一直線。', formula: 'aₙ = a₁ + (n − 1)d', sum: 'Sₙ = n(a₁ + aₙ) / 2', question: '把首尾兩項配對，和會改變嗎？' },
  { id: 'geometric', title: '等比數列', en: 'Geometric sequences', tag: '把增長，放大來看', symbol: '×r', intro: '從一粒種子到倍數成長：相鄰兩項有相同的倍數關係，不代表每一步增加一樣多。', formula: 'aₙ = a₁rⁿ⁻¹', sum: 'Sₙ = a₁(1 − rⁿ) / (1 − r)，r ≠ 1', question: '每次翻倍，和每次加二，有甚麼不同？' },
  { id: 'triangular', title: '三角形數列', en: 'Triangular numbers', tag: '把一排一排，拼成答案', symbol: '△', intro: '第一排一點，第二排兩點，第三排三點。把兩個相同的三角形轉一轉，藏著的公式就出現了。', formula: 'aₙ = n(n + 1) / 2', sum: 'Sₙ = n(n + 1)(n + 2) / 6', question: '兩個一樣的三角形，可以拼出甚麼？' },
  { id: 'fibonacci', title: '斐波那契數列', en: 'Fibonacci numbers', tag: '前兩步，決定下一步', symbol: 'Fₙ', intro: '從 1、1 開始，每一項都是前兩項的和。用顏色追蹤兩個來源，看懂遞推而不只背答案。', formula: 'F₁ = F₂ = 1；Fₙ = Fₙ₋₁ + Fₙ₋₂（n ≥ 3）', sum: 'Sₙ = Fₙ₊₂ − 1', question: '不背公式，你能建造出下一項嗎？' },
  { id: 'annuity', title: '年金與複利', en: 'Annuities & compound interest', tag: '讓數列，走進生活', symbol: '$', intro: '每年存入同樣金額，為甚麼每筆錢的終值不同？沿著時間線，看看複利如何把等比數列帶進生活。', formula: '期末年金 FV = P[(1 + i)ⁿ − 1] / i', sum: '期初年金 = 期末年金 × (1 + i)', question: '早一年存入，會改變多少？' },
];
export const defaults = { n: 5, a: 2, d: 3, r: 2, payment: 1000, rate: 5, due: false };
export function normalize(input = {}) {
  const num = (key, min, max, fallback) => Number.isFinite(Number(input[key])) ? Math.min(max, Math.max(min, Number(input[key]))) : fallback;
  return { n: Math.round(num('n', 1, 12, 5)), a: num('a', -20, 20, 2), d: num('d', -10, 10, 3), r: num('r', -3, 3, 2), payment: num('payment', 0, 100000, 1000), rate: num('rate', 0, 30, 5), due: input.due === true };
}
export function calculate(id, input) {
  const p = normalize(input);
  const values = [];
  for (let k = 1; k <= p.n; k++) {
    if (id === 'arithmetic') values.push(p.a + (k - 1) * p.d);
    else if (id === 'geometric') values.push(p.a * p.r ** (k - 1));
    else if (id === 'triangular') values.push(k * (k + 1) / 2);
    else if (id === 'fibonacci') values.push(k < 3 ? 1 : values[k - 2] + values[k - 3]);
    else if (id === 'annuity') values.push(p.payment * (1 + p.rate / 100) ** (p.n - k + (p.due ? 1 : 0)));
    else values.push(k * k);
  }
  return { params: p, values, last: values.at(-1), sum: values.reduce((a, b) => a + b, 0), principal: p.payment * p.n };
}
export function format(value) { return Number(value.toFixed(3)).toLocaleString('zh-Hant', { maximumFractionDigits: 3 }); }
export function makeQuiz(id, p) {
  const n = Math.min(p.n + 1, 12);
  const c = calculate(id, { ...p, n });
  if (id === 'annuity') return { question: `每年期末存入 $${format(p.payment)}，年利率 ${p.rate}%，共 ${p.n} 年，終值是多少？（四捨五入至整數）`, answer: Math.round(calculate(id, {...p, due:false}).sum), hint: '把每筆存款累積到最後一年的金額相加，最後一筆尚未生息。', solution: '各筆存款的終值組成等比數列。利率為 0 時，終值就是本金總額。' };
  return { question: `依照目前的規律，第 ${n} 項是多少？`, answer: c.last, hint: id === 'square' ? `把邊長 ${n} 的正方形分成 ${n} 排。` : id === 'triangular' ? `試試把 1 到 ${n} 相加，或用一半的長方形。` : id === 'fibonacci' ? '把前兩項相加，不是把上一項乘二。' : id === 'arithmetic' ? `從首項 ${p.a} 開始，加 ${n - 1} 次公差 ${p.d}。` : `從首項 ${p.a} 開始，乘 ${n - 1} 次公比 ${p.r}。`, solution: `${lessons.find(l => l.id === id).formula}。代入後，第 ${n} 項 = ${format(c.last)}。` };
}
