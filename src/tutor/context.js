import { calculate, format, lessons, normalize } from '../math.js';

export const modes = {
  hint: '給一點提示',
  check: '核對我的想法',
  explain: '看完整解析',
  experiment: '建議改實驗',
};

export const pageNames = { path: '學習路徑', learn: '理解與推導', lab: '互動實驗室', quiz: '小試身手' };
export const viewNames = { shape: '幾何視角', graph: '數列圖表', sum: '累積求和' };
export const parameterNames = { n: '項數', a: '首項', d: '公差', r: '公比', payment: '每年存入', rate: '年利率', due: '存入時點' };
const extras = { arithmetic: ['a', 'd'], geometric: ['a', 'r'], annuity: ['payment', 'rate', 'due'] };

export const experimentPage = page => page === 'lab' || page === 'learn';
export const parameterKeys = lesson => ['n', ...(extras[lesson] ?? [])];
export const pickParams = (lesson, params) => Object.fromEntries(parameterKeys(lesson).map(key => [key, params[key]]));

export function experimentContext(lesson, page, params, view, proof, selected) {
  if (!experimentPage(page) || !params) return { page };
  return {
    page,
    view: Object.hasOwn(viewNames, view) ? view : 'shape',
    ...(lesson === 'triangular' && view === 'shape' && proof === true && { proof: true }),
    ...(Number.isInteger(selected) && selected >= 1 && selected <= params.n && { selected }),
    params: pickParams(lesson, params),
  };
}

export const contextKey = (lesson, context) => JSON.stringify([lesson, context]);

export function parameterValue(key, value) {
  if (key === 'due') return value ? '期初' : '期末';
  if (key === 'rate') return `${value}%`;
  if (key === 'payment') return `$${value}`;
  return String(value).replace('-', '−');
}

export function snapshotLabel(context) {
  if (!context.params) return pageNames[context.page];
  return [viewNames[context.view], ...Object.entries(context.params).map(([key, value]) =>
    `${parameterNames[key]} ${parameterValue(key, value)}`), ...(context.proof ? ['已拼合點陣'] : []),
    ...(context.selected ? [`選中第 ${context.selected} 項`] : [])].join(' · ');
}

export function experimentAction(raw, lesson, params) {
  if (!raw?.params || typeof raw.params !== 'object' || Array.isArray(raw.params)) return null;
  if (raw.lesson !== undefined && raw.lesson !== lesson) return null;
  const keys = Object.keys(raw.params);
  const allowed = parameterKeys(lesson);
  if (!keys.length || keys.some(key => !allowed.includes(key))) return null;
  if (keys.some(key => key === 'due' ? typeof raw.params[key] !== 'boolean' :
    typeof raw.params[key] !== 'number' || !Number.isFinite(raw.params[key]))) return null;
  const normalized = normalize(raw.params);
  if (keys.some(key => raw.params[key] !== normalized[key])) return null;
  const changed = keys.filter(key => normalized[key] !== params[key]);
  return changed.length ? { params: Object.fromEntries(changed.map(key => [key, normalized[key]])) } : null;
}

export function calculatedFacts(lesson, context) {
  if (!context.params) return null;
  const { values, sum, last, principal } = calculate(lesson, context.params);
  const { n, r, rate, due } = context.params;
  const facts = { values, last, sum };
  if (context.selected) {
    const prefix = values.slice(0, context.selected);
    facts.selected = { term: context.selected, value: prefix.at(-1), sum: prefix.reduce((a, b) => a + b, 0) };
  }
  if (lesson === 'square') facts.newTiles = 2 * (context.selected ?? n) - 1;
  if (lesson === 'geometric') facts.sumRule = r === 1 ? 'Sₙ = n × a₁；1−r=0，不可除以零。' : 'Sₙ = a₁(1−rⁿ)/(1−r)。';
  if (lesson === 'annuity') Object.assign(facts, { principal, interest: sum - principal,
    periods: values.map((_, i) => n - i - 1 + Number(due)), zeroInterest: rate === 0 });
  return facts;
}

export function factLabel(lesson, context, facts) {
  const n = context.params.n;
  if (lesson === 'annuity') return `本金 $${format(facts.principal)} · 利息 $${format(facts.interest)} · 終值 $${format(facts.sum)}`;
  if (facts.selected) {
    const { term, value, sum } = facts.selected;
    return context.view === 'sum' ? `前 ${term} 項和：${format(sum)}` : `第 ${term} 項：${format(value)}`;
  }
  return `第 ${n} 項：${format(facts.last)} · 前 ${n} 項和：${format(facts.sum)}`;
}

export function labQuestion(lesson, context) {
  if (!context.params) return context.page === 'path' ? '我應該從哪個數列開始？先給我一個可試的觀察。' :
    '打開這章的實驗前，我可以先預測甚麼？';
  const { r, rate } = context.params;
  return ({
    square: '我應該怎樣從圖上區分一項、累積和與新加的方塊？',
    arithmetic: '用這組數字，怎樣找出位置和公差的關係？',
    geometric: r === 1 ? '公比是 1 時，怎樣從畫面找前幾項的和？' :
      r < 0 ? '公比是負數時，怎樣觀察項的正負和部分和？' : '應該比較哪兩項，才看得出公比？',
    triangular: '怎樣用點陣分清一個三角形和所有三角形的總點數？',
    fibonacci: '我該看哪兩項，才知道下一項怎麼來？',
    annuity: rate === 0 ? '利率是零時，怎樣從時間線看出改期初會不會改變終值？' :
      '哪一筆存款生息最久？在時間線上怎樣看出來？',
  })[lesson];
}

export function lessonTitle(lesson) {
  return lessons.find(item => item.id === lesson)?.title;
}
