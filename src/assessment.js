import { arithmeticTerm, calculate, defaults, normalize, powerSums, recurrence } from './math.js';
import { annuityPresentValue, amortizeLoan } from './learning/finance.js';
import { superscript } from './visualizations/mathNotation.js';

const significantDigits = 8;
const roundSignificant = value => Number(value.toPrecision(significantDigits));
const number = (prompt, answer, steps, hints, mistakes = [], precision = 'exact') =>
  ({ prompt, answer: precision === 'significant' ? roundSignificant(answer) : answer,
    ...(precision === 'significant' && { exactAnswer: answer }), steps, hints, mistakes, precision });
const choice = (prompt, options, answer, steps, hints) =>
  ({ prompt, options, answer, steps, hints });

export const skills = {
  square: ['分辨單項與和', '用奇數求新增方塊', '解釋 L 形', '解釋立方和的抵消', '選用整數和、平方和及立方和'],
  arithmetic: ['運用通項', '反求位置', '反求公差', '辨認等差', '用和建立模型', '解釋配對', '診斷步數與位置錯誤'],
  geometric: ['運用通項', '辨認等比', '運用有限和', '解釋收斂', '求負公比的無窮和'],
  triangular: ['求三角形數', '反求層數', '解釋配對', '求多個完整三角形的點數'],
  fibonacci: ['使用遞推', '比較初始條件', '解釋求和', '求不同起點的遞推和'],
  annuity: ['計算終值', '辨認現金流時點', '反求付款', '解釋零利率', '分辨終值、本金與利息', '折現求年金現值', '求每月供款', '辨別供款中的本金與利息'],
};

const nText = '請輸入數字；可用小數、分數或科學記數法。';
const instructions = {
  exact: nText,
  integer: '四捨五入至整數，只輸入數字，不加貨幣符號。',
  significant: `如有需要，四捨五入至 ${significantDigits} 位有效數字；可用小數、分數或科學記數法。`,
};

export function readNumber(raw) {
  const text = String(raw).normalize('NFKC').trim().replace(/[−–]/g, '-');
  const literal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/i;
  const parts = text.split(/[\/⁄]/).map(part => part.trim());
  if (text.length > 64 || parts.length > 2 || !parts.every(part => literal.test(part))) return null;
  const [a, b = 1] = parts.map(Number);
  const value = a / b;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(value) || b === 0) return null;
  if (value === 0 && /[1-9]/.test(parts[0].split(/e/i)[0])) return null;
  return value;
}

function matchesAnswer(value, expected, precision) {
  if (value === expected) return true;
  if (precision !== 'significant' || value === 0 || expected === 0) return false;
  const magnitude = Math.abs(expected);
  const place = Math.floor(Math.log10(magnitude)) - significantDigits + 1;
  return Math.abs(value - expected) <= 0.5 * 10 ** place + Number.EPSILON * magnitude;
}

export function grade(item, raw) {
  const value = item.options ? (raw === '' || !/^\d+$/.test(raw) ? null : Number(raw)) : readNumber(raw);
  if (value === null || (item.options && value >= item.options.length)) return { status: 'invalid' };
  if (matchesAnswer(value, item.exactAnswer ?? item.answer, item.precision)) return { status: 'correct' };
  const feedback = item.options ? item.options[value][1] : item.mistakes.find(([wrong]) => matchesAnswer(value, wrong, item.precision))?.[1];
  return { status: 'retry', feedback: feedback || item.hints[0] };
}

const parenthesize = x => x < 0 ? `(${x})` : x;
const money = x => new Intl.NumberFormat('zh-Hant', { maximumFractionDigits: 6 }).format(x);

function stabilizeHalfDollar(value) {
  const midpoint = Math.floor(value) + 0.5;
  return Math.abs(value - midpoint) <= 16 * Number.EPSILON * value ? midpoint : value;
}

const questions = {
  square: [
    (_, v) => {
      const n = 3 + v % 8, c = calculate('square', { n });
      return number(`平方數列 aₖ = k²。前 ${n} 項的和 Sₙ 是多少？`, c.sum,
        [`Sₙ 是多項的總和：${c.values.join(' + ')}。`, `加起來得到 ${c.sum}，不是第 ${n} 項 ${c.last}。`],
        ['先分辨題目問一個正方形，還是所有正方形。', '從 1² 寫到 n²，再相加。'],
        [[c.last, `你算出的是第 ${n} 項。` + '題目要把每個正方形的方塊數加起來。']]);
    },
    (_, v) => {
      const n = 4 + v % 8;
      return number(`把邊長 ${n - 1} 的方塊正方形擴成邊長 ${n}，要添幾塊？`, 2 * n - 1,
        [`一邊加 ${n} 塊，另一邊加 ${n - 1} 塊，角落只算一次。`, `${n} + ${n - 1} = ${2 * n - 1}。`],
        ['數 L 形的兩臂，角落只屬於一臂。', '也可以算大正方形面積減小正方形面積。'],
        [[2 * n, '兩臂各算同樣長，會把角落重算。']]);
    },
    (_, v) => {
      const n = 5 + v % 7;
      return choice(`為甚麼 1 + 3 + ⋯ + ${2 * n - 1} = ${n}²？`,
        [['每個奇數是相鄰正方形面積之差，逐層加回就得到大正方形。'], ['加的是每個正方形的全部面積。', '全部面積相加是平方和，不是新增方塊的和。'], ['因為最後一個奇數就是大正方形的面積。', '最後一個奇數只是一層，不是整塊。']], 0,
        [`第 k 層有 k² − (k − 1)² = 2k − 1 塊。`, `把各層相加，重複的舊面積抵消，只剩 ${n}²。`],
        ['比較單層與整塊。', '想想每一個奇數在圖上代表甚麼。']);
    },
    (_, v) => {
      const n = 3 + v % 7, { linear, cube } = powerSums(n);
      return choice(`怎樣用三角數證明 1³+⋯+${n}³=${cube}？`,
        [['把每項寫成 Tₖ²−Tₖ₋₁²，再相加抵消。'], ['把每項寫成 Tₖ−Tₖ₋₁，直接相加。', '這只留下 k，而不是 k³。'], ['把平方和再平方。', '要平方的是整數和，不是平方和。']], 0,
        ['Tₖ−Tₖ₋₁=k，Tₖ+Tₖ₋₁=k²；相乘才得到 k³。', `抵消後是 Tₙ²=${linear}²=${cube}。`],
        ['先拆平方差。', '想想相鄰兩個三角數的和與差。']);
    },
    (_, v) => {
      const n = 3 + v % 7, { linear, square, cube } = powerSums(n);
      return number(`每個展品都是 k×k×k 的立方體，k 從 1 到 ${n}。所有展品合共幾塊積木？`, cube,
        [`每個展品不是一層平面；要加 1³+⋯+${n}³。`, `先算整數和 ${n}×(${n}+1)÷2=${linear}，再平方，得 ${cube}。`],
        ['先分清每個展品的長、闊、高。', '立方和等於整數和的平方。'],
        [[square, '這是把每個展品當成一層正方形。'], [linear, '這只是整數和，還要平方。']]);
    },
  ],
  arithmetic: [
    (p, v) => {
      const a = v ? 3 + v % 11 : p.a, d = v ? (v % 2 ? -2 : 2.5) : p.d, n = v ? 4 + v % 8 : Math.min(p.n + 1, 13);
      const answer = arithmeticTerm(a, d, n);
      return { ...number(`等差數列首項為 ${a}，公差為 ${d}。第 ${n} 項是多少？`, answer,
        [`由第 1 項到第 ${n} 項有 ${n - 1} 步。`, `aₙ = a₁ + (n − 1)d = ${a} + ${n - 1} × ${parenthesize(d)} = ${roundSignificant(answer)}（按題目精度）。`],
        ['從第 1 項起步，不是從第 0 項。', `用首項加上 ${n - 1} 次公差。`],
        [[arithmeticTerm(a, d, n + 1), '看來可能多走了一步：由 1 到 n 只走 n−1 步。'],
          [arithmeticTerm(0, d, n), '你可能只算了變化量；記得從首項出發。']], 'significant'), scenario: { a, d, n } };
    },
    (_, v) => {
      const a = 3 + v % 7, d = 4, n = 7 + v % 6, target = a + (n - 1) * d;
      return number(`等差數列首項為 ${a}，公差為 ${d}。${target} 是第幾項？`, n,
        [`設第 n 項為 ${target}，則 ${target} = ${a} + (n−1)×${d}。`,
          `先減去起點 ${a}，再除以每步的增量 ${d}，得到 ${n - 1} 步。由第 1 項出發，所以 n=${n}。`],
        ['先求由起點到目標走了多少步。', '再把步數轉換成項的位置。'],
        [[n - 1, '你算的是步數；第 1 項還沒有走任何一步。']]);
    },
    (_, v) => {
      const a = 8 + v % 6, gap = 4 + v % 4, d = v % 2 ? 3 : -2, b = a + gap * d;
      return number(`某等差數列的第 3 項是 ${a}，第 ${3 + gap} 項是 ${b}。公差是多少？`, d,
        [`兩項之間隔了 ${3 + gap} − 3 = ${gap} 步；總變化量是 ${b} − ${a} = ${b - a}。`,
          `每步變化 (${b - a}) ÷ ${gap} = ${d}。`],
        ['用後一項減去較早的項，注意符號。', '把總變化量分給這兩項之間的間隔。'],
        [[b - a, '這是全部間隔的總變化量，還要除以間隔數。']]);
    },
    (_, v) => {
      const a = 2 + v % 11, d = v % 2 ? -3 : 3;
      return choice(`以下哪個數列是等差數列？從給出的相鄰項判斷。`,
        [[`${a}、${a + d}、${a + 2 * d}、${a + 3 * d}`], [`${a}、${a + d}、${a + 2 * d + 1}、${a + 3 * d}`, '首兩項的差正確還不夠，下一個差不同。'], ['2、4、8、16', '這是固定乘 2；相鄰項的差並不固定。']], 0,
        [`把每一項減去前一項，正確一組的三個差都是 ${d}。`],
        ['檢查所有相鄰項，而不是只看第一對。', '使用相減，不是相除。']);
    },
    (_, v) => {
      const n = 5 + v % 8, a = 14 + v % 9, d = 2 + v % 3, last = a + (n - 1) * d, sum = n * (a + last) / 2;
      return number(`禮堂有 ${n} 排座位，首排 ${a} 個，其後每排多 ${d} 個。全場有多少座位？`, sum,
        [`最後一排有 ${a} + (${n} − 1) × ${d} = ${last} 個。`, `用首尾配對：${n} × (${a} + ${last}) ÷ 2 = ${sum} 個。`],
        ['每排座位數形成等差數列，但題目要全場總數。', '先求最後一排，再用首末兩排的平均取代每一排。'],
        [[last, '這是最後一排；還要把其他排算進來。'], [2 * sum, '你數了正寫、倒寫兩份，還要除以 2。']]);
    },
    (_, v) => {
      const n = 4 + 2 * (v % 4) + (v % 2);
      return choice(`求 ${n} 項等差數列的和時，將數列正寫、倒寫，各欄對齊相加後，為甚麼要除以 2？`,
        [['兩行各有一整個 Sₙ，欄和加總是 2Sₙ。'], ['因為每次只能配好一半欄。', '兩行都有 n 欄，連中間自配的一欄也算。'], ['因為首尾兩項之差為 2。', '首尾之差不必是 2；除以 2 來自重數。']], 0,
        [`對齊產生 ${n} 欄，各欄皆為 a₁ + aₙ。`, '總和一方面是 n(a₁ + aₙ)，另一方面是 Sₙ + Sₙ。'],
        ['數一數你抄了幾份原數列。', '兩份加起來求得的是 2Sₙ。']);
    },
    (_, v) => {
      const a = 4 + v % 7, n = 6 + v % 5, d = -2;
      const correct = a + (n - 1) * d, extraStep = a + n * d, target = correct - 1;
      return choice(`首項 ${a}，公差 −2。小明算第 ${n} 項為 ${a} + ${n} × (−2) = ${extraStep}，又把算出的位置四捨五入，說 ${target} 也是本數列的一項。哪一個解釋正確？`,
        [[`第 ${n} 項是 ${correct}，因為從首項只走 ${n - 1} 步。${target} 在兩個相鄰項之間，不在數列中。`],
          [`第 ${n} 項是 ${extraStep}，因為項的位置就是步數。${target} 不是一項。`, '首項已經是第 1 項，還沒有走任何一步。'],
          [`第 ${n} 項是 ${correct}，但 ${target} 也可以算一項，因為位置可取最接近的整數。`, '把位置四捨五入會改變項值；只有正整數位置對應數列的項。']], 0,
        [`從 1 到 ${n} 只走 ${n - 1} 步，所以 aₙ = ${a} + ${n - 1} × (−2) = ${correct}。`,
          `下一項是 ${extraStep}。${target} 介乎相鄰兩項 ${correct} 與 ${extraStep}，等式解出 n = ${n} + ½，不是正整數。`],
        ['用小明的規則算第 1 項，會回到首項嗎？', '算出下一項，再判斷目標值是否介乎兩項之間。']);
    },
  ],
  geometric: [
    (p, v) => {
      const a = v ? 2 + v % 9 : p.a, r = v ? [0, 1, -2, 0.5][v % 4] : p.r, n = v ? 4 + v % 8 : p.n + 1;
      const answer = a * r ** (n - 1);
      return { ...number(`數列由首項 ${a} 開始，每一步乘 ${r}。第 ${n} 項是多少？`, answer,
        [`由第 1 項到第 ${n} 項，共乘 ${n - 1} 次。`, `aₙ = ${a} × ${parenthesize(r)}${superscript(n - 1)} = ${roundSignificant(answer)}（按題目精度）。`],
        ['一步代表乘一次，不是加一次。', `由第 1 項到第 ${n} 項，指數是 ${n - 1}。`],
        [[a * r ** n, '檢查是否多乘了一次。'], [0, '很小不等於零，試用科學記數法保留有效數字。']], 'significant'), scenario: { a, r, n } };
    },
    (_, v) => {
      const a = 2 + v % 7;
      return choice('哪一組可由固定乘數 −2 逐項生成？',
        [[`${a}、${-2 * a}、${4 * a}、${-8 * a}`], [`${a}、${a - 2}、${a - 4}、${a - 6}`, '每次減 2 是公差 −2，不是乘數 −2。'], [`${a}、${2 * a}、${4 * a}、${8 * a}`, '乘數是負數，非零項的正負應交替。']], 0,
        [`從 ${a} 連乘 −2：每次絕對值加倍、符號反轉。`],
        ['逐對檢查乘積，不只檢查大小。', '乘負數時符號會怎樣？']);
    },
    (_, v) => {
      const a = 2 + v % 5, n = 3 + v % 6, r = [2, 1, 0, -1][v % 4], c = calculate('geometric', { a, n, r });
      return number(`首項 ${a}，每步乘 ${r}，前 ${n} 項相加是多少？`, c.sum,
        [`列出各項：${c.values.join('，')}。`, r === 1 ? `r = 1，不用含 1−r 的除法；Sₙ = ${n} × ${a} = ${c.sum}。` : `Sₙ = ${a}(1 − ${parenthesize(r)}${superscript(n)}) ÷ (1 − ${parenthesize(r)}) = ${c.sum}。`],
        ['這是有限和，不是最後一項。', '若 r=1，每一項都等於首項，直接乘項數。'],
        [[c.last, '這是單項；請把題目的所有項相加。']]);
    },
    (_, v) => {
      const a = 2 + v % 7, r = v % 2 ? -1 : -0.5;
      return choice(`首項 ${a}、公比 ${r} 的無窮等比和怎樣？`,
        [[`收斂，因為 |${r}| < 1，部分和中的 rⁿ 趨向 0。`, '這個理由只適用於 |r|<1。'], ['不收斂；部分和一直在兩個不同值之間交替。', '有些交替會變小；需檢查乘數的絕對值。'], ['不收斂，因為有負項。', '負項並不排除收斂，關鍵是 |r|。']], r === -1 ? 1 : 0,
        [r === -1 ? `部分和為 ${a}、0、${a}、0、⋯，並不趨向同一值。` : `雖然有正負交替，rⁿ 趨近 0，故部分和趨向 ${a} ÷ 1.5。`],
        ['看的是 S₁、S₂、… 有沒有逼近同一個數。', '判斷 |r|，而不是只看正負。']);
    },
    (_, v) => {
      const a = 3 * (2 + v % 8), answer = a / 1.5;
      return number(`首項 ${a}、公比 −½ 的數列交替正負。它的無窮和是多少？`, answer,
        ['每一項的絕對值減半；rⁿ 趨近零。', `用 a₁÷(1−r)：${a}÷[1−(−½)]=${answer}。`],
        ['負號決定方向，絕對值決定是否縮小。', '分母要減的是負公比。'],
        [[0, '項趨近 0，不代表部分和趨近 0。'], [2 * a, '你用的是正公比 ½；這裏要減去負公比。']]);
    },
  ],
  triangular: [
    (_, v) => {
      const n = 4 + v % 9, answer = n * (n + 1) / 2;
      return number(`點陣有 ${n} 排：第 1 排 1 點，依此類推。共有幾點？`, answer,
        [`兩個同樣的點陣可以拼成 ${n} × ${n + 1} 的長方形。`, `原點陣只有一半：${n} × ${n + 1} ÷ 2 = ${answer}。`],
        ['列出每一排的點數。', '也可先拼出兩份，再除以 2。'], [[2 * answer, '你數的是兩份點陣。']]);
    },
    (_, v) => {
      const n = 5 + v % 8, total = n * (n + 1) / 2;
      return number(`一個完整三角形點陣有 ${total} 點。由 1 點一排開始，共有幾排？`, n,
        [`找相鄰兩整數 n、n+1，使乘積為 ${2 * total}。`, `${n} × ${n + 1} ÷ 2 = ${total}，所以有 ${n} 排。`],
        ['問的是排數，不是點數。', '用 n(n+1)/2 回代檢驗。']);
    },
    (_, v) => {
      const n = 4 + v % 9;
      return choice(`為甚麼 Tₙ + Tₙ₋₁ 等於 ${n}²（這裡 n=${n}）？`,
        [['大小相差一排的兩個三角形，沿對角線可拼成邊長 n 的正方形。'], ['用同樣大的兩個 Tₙ 拼成正方形。', '兩個 Tₙ 拼成 n×(n+1)，多了一列。'], ['因為把最後兩項當成全部點的總數。', '這個等式只涉及相鄰兩項，不是把所有 Tₖ 加起來。']], 0,
        [`各排互補到 ${n} 點，共 ${n} 排；代數上 Tₙ + Tₙ₋₁ = n[(n+1)+(n−1)]/2 = n²。`],
        ['比較兩份 Tₙ 和一大一小兩份的外框。', '兩個大小相差一排的點陣，恰好補出方形。']);
    },
    (_, v) => {
      const n = 4 + v % 7, c = calculate('triangular', { n });
      return number(`展覽有 1 層、2 層、⋯、${n} 層的三角點陣各一個。全場共有多少點？`, c.sum,
        [`每個展品是完整三角形，點數分別是 ${c.values.join('、')}。`, `相加得 ${c.sum}；公式核對：${n}×(${n}+1)×(${n}+2)÷6。`],
        ['把每個展品當作一項。', '最大的展品是最後一項，還有較小的展品。'],
        [[c.last, '這只是最大展品的點數。']]);
    },
  ],
  fibonacci: [
    (_, v) => {
      const n = 5 + v % 8, c = calculate('fibonacci', { n });
      const [a, b] = c.values.slice(-3, -1);
      return number(`依斐波那契規則，已知第 ${n - 2} 項為 ${a}、第 ${n - 1} 項為 ${b}，第 ${n} 項是多少？`, c.last,
        [`下一項要用前兩項：${a} + ${b} = ${c.last}。`],
        ['尋找兩個來源，而不是只看上一項。', '用加法組合前兩項。'], [[b * 2, '不是上一項乘二；兩個來源的值不同。']]);
    },
    (_, v) => {
      const a = 2 + v % 6, b = a + 3;
      return choice(`另一個數列的首兩項是 ${a}、${b}，之後也用「前兩項相加」。它和 1、1 開始的斐波那契數列一樣嗎？`,
        [[`不一樣。初始值不同，第三項是 ${a + b}，而不是 2。`], ['一樣；有相同遞推式就一定一樣。', '遞推給的是做法；初始值也參與決定結果。'], [`不一樣，因為第三項應是 ${a * b}。`, '這個遞推用相加，不是相乘。']], 0,
        [`${a} + ${b} = ${a + b}，而 1 + 1 = 2。`, '要定義這個遞推數列，規則與兩個初始值缺一不可。'],
        ['各用自己的前兩項算第三項。', '比較規則與初始資料分別做甚麼。']);
    },
    (_, v) => {
      const n = 3 + v % 7, answer = calculate('fibonacci', { n }).sum;
      return choice(`前 ${n} 個斐波那契數的和是 ${answer}。哪個推理可推廣到所有 n？`,
        [['把每項寫成 Fₖ₊₂ − Fₖ₊₁ 之後相加，中間項抵消。'], ['只要把最後一項乘二。', '總和不是固定等於最後一項兩倍。'], ['把 Fₖ 都寫成 Fₖ₊₁ − Fₖ₊₂。', '差的順序顛倒，會得到 −Fₖ。']], 0,
        ['從 Fₖ₊₂ = Fₖ₊₁ + Fₖ 改寫差式。', '相加得到 Fₙ₊₂ − F₂ = Fₙ₊₂ − 1。'],
        ['用遞推式把加法改寫為兩個相鄰項的差。', '寫出前兩個差式，找重複並能抵消的項。']);
    },
    (_, v) => {
      const a = 2 + v % 7, b = a + 1, n = 5 + v % 4;
      const { values, next, sum } = recurrence(a, b, n);
      return number(`由 ${a}、${b} 開始，此後每項是前兩項之和。前 ${n} 項相加是多少？`, sum,
        [`前 ${n} 項為 ${values.join('、')}；向後再推兩項，第 ${n + 2} 項是 ${next}。`, `相鄰差抵消，只剩 ${next}−${b}=${sum}。`],
        ['先用兩個起點生成各項。', '最後剩下的減數是第二項，不一定是 1。'],
        [[next - 1, '這次第二項不是 1，不可直接套標準斐波那契數列的常數。']]);
    },
  ],
  annuity: [
    (p, v) => {
      const c = calculate('annuity', v ? { n: 3 + v % 7, payment: 300 + 100 * (v % 7), rate: [0, 5, 10, 4][v % 4], due: v % 2 === 0 } : p);
      const { n, payment, rate, due } = c.params, timing = due ? '期初' : '期末', i = rate / 100;
      const total = stabilizeHalfDollar(c.sum), answer = Math.round(total);
      const alternate = Math.round(stabilizeHalfDollar(calculate('annuity', { ...c.params, due: !due }).sum));
      const displayedTotal = Math.round(Number(total.toFixed(6))) === answer ? money(total) : total;
      return { ...number(`每年${timing}存入 MOP ${payment}，年利率 ${rate}%，每年複利一次，共 ${n} 年。第 ${n} 年年末的終值是多少澳門元？`, answer,
        [`同以第 ${n} 年年末估值。第一筆生息 ${n - 1 + Number(due)} 年，最後一筆生息 ${Number(due)} 年。`,
          i === 0 ? `零利率直接相加本金：${n} × ${payment} = ${c.sum}。` : `化百分比為小數 i = ${i}。先把各筆搬到同一時點再加：${money(c.values[0])}${n > 2 ? ' + ⋯ + ' : n === 2 ? ' + ' : ''}${n > 1 ? money(c.last) : ''}。`,
          Number.isInteger(total) ? `終值已是整數澳門元：MOP ${money(answer)}，不需四捨五入。` : `保留中間精度，最後四捨五入：MOP ${displayedTotal} → MOP ${money(answer)}。`],
        [`這是${timing}存款；先標出最後一筆到第 ${n} 年年末相隔多少年。`, '用 P(1+i) 的適當次方算各筆終值；零利率只累計本金。'],
        [[alternate, `你可能用了另一種存款時點；題目指定每年${timing}。`]], 'integer'), scenario: c.params };
    },
    (_, v) => {
      const n = 3 + v % 8, due = v % 2 === 0;
      return choice(`共存 ${n} 年、每年${due ? '期初' : '期末'}存一筆。在第 ${n} 年年末估值，第一筆和最後一筆各生息幾年？`,
        [[`${n} 年、1 年`, '這是期初的時間線；這題的存款時點不同。'], [`${n - 1} 年、0 年`, '這是期末的時間線；這題的存款時點不同。'], [`各 ${n} 年`, '付款時間不同，不會都生息同樣久。']], due ? 0 : 1,
        [`第一筆在 t=${due ? 0 : 1}，最後一筆在 t=${due ? n - 1 : n}。`, `分別用終點 t=${n} 減去各存款時點。`],
        ['先畫從 t=0 到 t=n 的線。', '期初在該年開始時存，期末在該年結束時存。']);
    },
    (_, v) => {
      const p = 200 + 100 * (v % 10), n = 2, rate = 10, factor = 2.1, target = Math.round(p * factor);
      return number(`連續 ${n} 年每年期末各存相同金額，年利率 ${rate}%。第 2 年年末共有 MOP ${target}。每次存入多少澳門元？`, p,
        [`第一筆生息一年為 1.1P，第二筆沒有生息為 P。`, `解 2.1P = ${target}，得到 P = ${p}。`],
        ['先用 P 表示一筆存款，不要直接把終值平分。', '兩筆在終點的價值是 1.1P 和 P。']);
    },
    (_, v) => {
      const n = 4 + v % 8, p = 400 + 100 * (v % 9);
      return choice(`年利率為 0%，每年等額存 MOP ${p}，共 ${n} 年。期初和期末哪一種終值較大？`,
        [[`一樣；每筆都不生息，終值都是 MOP ${n * p}。`], ['期初較大，因為時間多一年。', '時間確實較長，但 0% 不產生利息。'], ['兩種都無法計算，因為公式除以零。', '公式要分情況；零利率可直接相加本金。']], 0,
        [`i=0 時，每筆 P(1+i)ᵏ = P；n 筆相加是 ${n * p}。`],
        ['時間較長不代表一定有利息。', '想想 1+0 等於多少。']);
    },
    (_, v) => {
      const payment = 100 * (5 + v % 9), total = 231 * (payment / 100);
      const principal = 2 * payment, interest = total - principal;
      return number(`連續兩年每年期初存 MOP ${payment}，年利率 10%。第 2 年年末賺到的利息是多少澳門元？`, interest,
        [`兩筆分別生息兩年和一年；終值是 ${payment}×(1.1²+1.1)=${total}。`, `本金為 2×${payment}=${principal}，所以利息是 ${total}−${principal}=${interest}。`],
        ['先把兩筆都估值到第 2 年年末。', '問利息，不是問存摺上的全部金額。'],
        [[total, '這是兩筆合起來的終值；還要扣掉本金。'], [principal, '這是原本存入的本金，不是增加的金額。']]);
    },
    (_, v) => {
      const payment = 121 * (1 + v % 7), due = v % 2 === 1;
      const answer = Math.round(annuityPresentValue(payment, 0.10, 2, due));
      return number(`連續兩年每年${due ? '年初' : '年末'}收到 MOP ${payment}。年折現率 10%，現值是多少澳門元？`, answer,
        [`第一和第二筆分別在 t=${due ? '0、1' : '1、2'}；折算到 t=0 要除以相應的 1.1 次方。`,
          `現值是兩筆折現金額的和，得 MOP ${answer}。`],
        ['問今天值多少，不是問兩年後值多少。', '先定下兩筆款項的 t，再除以 1.1 的對應次方。'],
        [[2 * payment, '這只加了金額，忽略其中至少一筆需要折現。'],
          [Math.round(annuityPresentValue(payment, 0.10, 2, !due)), '你可能用了另一種收款時點；先標出 t=0 是否已收款。']], 'integer');
    },
    (_, v) => {
      const principal = 20100 * (1 + v % 5), { monthlyPayment } = amortizeLoan(principal, 12, 2);
      const answer = Math.round(monthlyPayment);
      return number(`借款 MOP ${principal}，名義年利率 12%（按月計息），分兩個月每月底等額還清。每月供款是多少澳門元？`, answer,
        ['月利率是 12%÷12＝1%。兩筆月底供款折算到今天是 M÷1.01 和 M÷1.01²。',
          `兩筆現值相加等於借款本金，解得 M = ${principal}÷(1/1.01+1/1.01²) = ${answer}。`],
        ['先把名義年利率換成月利率。', '本金等於所有供款的現值，不是直接除以期數。'],
        [[principal / 2, '只把本金平分，等於沒有計息。'],
          [Math.round(amortizeLoan(principal, 144, 2).monthlyPayment), '12% 是年利率；每月用 1%，不能用 12%。']], 'integer');
    },
    (_, v) => {
      const principal = 20100 * (1 + v % 5), { schedule } = amortizeLoan(principal, 12, 2);
      const { principal: repaid, interest, payment } = schedule[0];
      return number(`借款 MOP ${principal}，名義年利率 12%（按月計息）。若第一個月底供款 MOP ${Math.round(payment)}，這一期實際歸還多少本金（澳門元）？`, Math.round(repaid),
        [`月利率 1%；第一個月利息是 ${principal}×0.01 = ${Math.round(interest)}。`,
          `從供款先扣利息，還本金 ${Math.round(payment)}−${Math.round(interest)} = ${Math.round(repaid)}。`],
        ['第一期按原本金計息。', '供款分成兩部分：利息和歸還的本金。'],
        [[Math.round(payment), '供款不是全數用來還本金；還要扣這期利息。'],
          [Math.round(interest), '這是本期利息，不是歸還的本金。']], 'integer');
    },
  ],
};

export function makeItem(id, skill, variant, input = defaults) {
  const draft = questions[id][skill](normalize(input), variant);
  if (draft.options) {
    const shift = (skill + variant) % draft.options.length;
    draft.options = [...draft.options.slice(shift), ...draft.options.slice(0, shift)];
    draft.answer = (draft.answer - shift + draft.options.length) % draft.options.length;
  }
  if (draft.scenario) Object.freeze(draft.scenario);
  return { ...draft, id: `${id}:${skill}:${variant}`, label: skills[id][skill], instruction: instructions[draft.precision] };
}
