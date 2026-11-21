import { arithmeticTerm, calculate, powerSums, recurrence } from '../math.js';
import { superscript } from '../visualizations/mathNotation.js';

const display = x => String(Number(x.toPrecision(10)));
const group = x => `(${display(x)})`;
const add = values => values.map((value, i) => i > 0 && value < 0 ? group(value) : display(value)).join(' + ');

function arithmeticPosition(a, d, target) {
  if (d === 0) return target === a ? '公差是 0，目標等於首項；每個位置都符合。' : '公差是 0，目標不等於首項；沒有任何位置符合。';
  const position = 1 + (target - a) / d;
  const candidate = Math.round(position);
  const valid = Number.isSafeInteger(candidate) && candidate >= 1 && arithmeticTerm(a, d, candidate) === target;
  return `反推：位置 = 1 + (${display(target)}−${group(a)})÷${group(d)}；${valid ?
    `代回驗證，${display(target)} 是第 ${candidate} 項。` :
    `估算位置為 ${display(position)}，沒有可驗證的正整數位置（只檢查安全整數範圍）；不可直接把位置四捨五入。`}`;
}

export function workedComputation(id, input) {
  const c = calculate(id, input);
  const { a, d, n, r, payment, rate, due } = c.params;
  switch (id) {
    case 'square': {
      const { linear, square, cube } = powerSums(n);
      return [
        `第 ${n} 個正方形是 ${n}×${n} = ${c.last} 塊；它比上一個多 ${n}+(${n}−1) = ${2 * n - 1} 塊。`,
        `前 ${n} 個正整數和：${n}×(${n}+1)÷2 = ${linear}。`,
        `前 ${n} 個平方和：${add(c.values)} = ${square}；公式核對：${n}×(${n}+1)×(2×${n}+1)÷6 = ${square}。`,
        `前 ${n} 個立方和：先求整數和，再平方；(${linear})² = ${cube}。`,
      ];
    }
    case 'arithmetic':
      return [
        `由第 1 項走到第 ${n} 項有 ${n - 1} 步：aₙ = ${display(a)} + ${n - 1}×${group(d)} = ${display(c.last)}。`,
        `各項為：${c.values.map(display).join('、')}。`,
        `正寫和倒寫各一份，每欄都是首項加末項。Sₙ = ${n}×(${display(a)} + ${group(c.last)})÷2 = ${display(c.sum)}。`,
        arithmeticPosition(a, d, input.target),
      ];
    case 'geometric': {
      const ratio = `(${r})`;
      const finite = r === 1 ? `r=1，直接把 ${n} 個 ${display(a)} 相加。` :
        `有限和：${display(a)}×[1−${ratio}${superscript(n)}]÷[1−${ratio}] ≈ ${display(c.sum)}。`;
      const infinite = a === 0 ? '首項為零，所有項及部分和一直是零。' : Math.abs(r) < 1 ?
        `|r|<1，無窮和為 ${display(a)}÷[1−${ratio}] ≈ ${display(a / (1 - r))}；無窮和減目前部分和 ≈ ${display(a * r ** n / (1 - r))}。` :
        '|r|≥1，且首項不是零；項不趨近零，因此部分和不收斂。';
      return [n === 1 ? `第 1 項直接是 ${display(a)}，不用乘，也不用計算 0⁰。` :
        `共乘 ${n - 1} 次：aₙ = ${display(a)}×${ratio}${superscript(n - 1)} ≈ ${display(c.last)}。`,
        `把各項相加：${add(c.values)} ≈ ${display(c.sum)}。`, finite, infinite];
    }
    case 'triangular': {
      const target = input.target, layers = Math.floor(Math.sqrt(2 * target));
      return [
        `一個 ${n} 層三角形：兩份拼成 ${n}×${n + 1} 的長方形；一份有 ${n}×${n + 1}÷2 = ${c.last} 個點。`,
        `若是前 ${n} 個不同大小的三角形，則要加：${add(c.values)} = ${c.sum}。`,
        `用三角數和核對：${n}×${n + 1}×${n + 2}÷6 = ${c.sum}。`,
        `反推：要一個剛好有 ${target} 點的三角形，需找相鄰整數使 n(n+1)=${2 * target}。${layers}×${layers + 1}=${layers * (layers + 1)}，所以${layers * (layers + 1) === 2 * target ? `恰有 ${layers} 層。` : '這個點數不能排成完整三角形。'}`,
      ];
    }
    case 'fibonacci': {
      const { values, next, sum } = recurrence(input.first, input.second, n);
      const [first, second] = [input.first, input.second];
      return [
        `起點是 ${first}、${second}；第三項＝${first}＋(${second})＝${first + second}，往後每項都加前兩項。`,
        `前 ${n} 項：${values.join('、')}。第 ${n} 項是 ${values.at(-1)}。`,
        `把每項改寫成下一組相鄰差。中間抵消：第 ${n + 2} 項減第 2 項，即 ${next}−(${second})＝${sum}。`,
        `逐項核對：${add(values)} = ${sum}。`,
      ];
    }
    case 'annuity': {
      const factor = calculate('annuity', { ...c.params, payment: 1 }).sum;
      return [
        `以第 ${n} 年年末為終點；利率 ${rate}% = ${display(rate / 100)}，每年乘 ${display(1 + rate / 100)}。`,
        ...c.values.map((value, i) => {
          const t = i + (due ? 0 : 1);
          return `第 ${i + 1} 筆在 t=${t} 存入，生息 ${n}−${t}=${n - t} 年：MOP ${payment}×${group(1 + rate / 100)}${superscript(n - t)} ≈ MOP ${display(value)}。`;
        }),
        rate === 0 ? `零利率：終值＝${n}×${payment}＝MOP ${display(c.principal)}，利息為零。` :
          `用等比和核對：[(1+${display(rate / 100)})${superscript(n)}−1]÷${display(rate / 100)}${due ? `，期初再乘 (1+${display(rate / 100)})` : ''}，得到每 MOP 1 的終值係數 ≈ ${display(factor)}。總終值 ≈ MOP ${display(c.sum)}；減去本金 MOP ${display(c.principal)}，利息 ≈ MOP ${display(c.sum - c.principal)}。`,
        `反向：若以 MOP ${input.target} 為目標，所需每筆存款＝目標÷終值係數 ≈ MOP ${display(input.target / factor)}（計算時不先四捨五入係數）。`,
      ];
    }
    default: return [];
  }
}
