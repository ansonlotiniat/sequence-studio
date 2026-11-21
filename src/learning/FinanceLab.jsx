import React, { useState } from 'react';
import { annuityPresentValue, amortizeLoan, presentValueFactor } from './finance.js';
import ComparisonTable from '../ComparisonTable.jsx';

const cash = new Intl.NumberFormat('zh-Hant', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = value => cash.format(value);
const coefficient = value => Number(value.toPrecision(8));
const models = {
  pv: [
    ['payment', '每年收款（MOP）', 0, 100000, 'any', 121],
    ['percent', '年折現率（%）', 0, 30, 'any', 10],
    ['periods', '年數', 1, 50, 1, 2],
  ],
  loan: [
    ['principal', '借款本金（MOP）', 1, 10000000, 'any', 12000],
    ['percent', '年利率（%）', 0, 36, 'any', 12],
    ['periods', '還款月數', 1, 360, 1, 12],
  ],
};

export default function FinanceLab({ mode, onWorked }) {
  const fields = models[mode];
  const [draft, setDraft] = useState(() => Object.fromEntries(fields.map(([key, , , , , value]) => [key, value])));
  const [due, setDue] = useState(false);
  const [result, setResult] = useState(null);
  const pv = mode === 'pv';

  function compute(event) {
    event.preventDefault();
    const params = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, Number(value)]));
    const { payment, percent, periods, principal } = params;
    setResult({ ...params, due, ...(pv ? { rate: percent / 100,
      present: annuityPresentValue(payment, percent / 100, periods, due) } : amortizeLoan(principal, percent, periods)) });
    onWorked();
  }

  return <>
    <p>{pv ? '把未來每筆錢搬回今天（t=0）。同樣的現金流，試把時點移早一年。' :
      '固定年利率（名義利率按月除以 12）、每月底等額還款，不計費用。先猜第一期供款中有多少在還本金。'}</p>
    <form onSubmit={compute}>
      <div className="worked-fields">
        {fields.map(([key, label, min, max, step]) => <label key={key}>{label}
          <input type="number" min={min} max={max} step={step} required value={draft[key]} onChange={event => {
            setDraft({ ...draft, [key]: event.target.value }); setResult(null);
          }} />
        </label>)}
        {pv && <label>收款時點<select value={due ? 'due' : 'ordinary'} onChange={event => { setDue(event.target.value === 'due'); setResult(null); }}>
          <option value="ordinary">每年年末</option><option value="due">每年年初</option>
        </select></label>}
      </div>
      <button className="primary-button">顯示逐步計算</button>
    </form>
    {result && <div className="worked-solution finance-result">
      {pv ? <>
        <p role="status"><strong>今日現值：MOP {money(result.present)}</strong></p>
        <ol>
          <li>每年收 MOP {result.payment}，共 {result.periods} 期。第一筆在 t={due ? 0 : 1}；年折現率是 {result.rate}。</li>
          <li>{result.rate === 0 ? '零折現率：每筆保留原金額，直接用每期金額乘期數。' :
            <>每筆除以 (1+i) 的相應次方。年末現值先算 <span className="finance-math">P[1−(1+i)⁻ⁿ]÷i</span>，每 MOP 1 的年末現值係數約 {coefficient(presentValueFactor(result.rate, result.periods))}{due ? '。年初每筆少折現一年，係數再乘 (1+i)。' : '。'}</>}</li>
          {result.rate > 0 && <li>第一筆現值：MOP {money(result.payment / (1 + result.rate) ** (due ? 0 : 1))}；最後一筆：MOP {money(result.payment / (1 + result.rate) ** (result.periods - Number(due)))}。</li>}
        </ol>
      </> : <>
        <p role="status"><strong>每月供款：MOP {money(result.monthlyPayment)}</strong></p>
        <ol>
          <li>把年利率除以 12，換成月利率 {coefficient(result.rate * 100)}%。借款本金是 {result.periods} 筆月底供款的現值。</li>
          <li>每月供款等於本金除以現值係數{result.rate === 0 ? '；零利率時，係數就是月數。' : ' [1−(1+j)⁻ⁿ]÷j。'}</li>
          <li>將本金 MOP {money(result.principal)} 除以現值係數（約 {coefficient(presentValueFactor(result.rate, result.periods))}），得每月供款 MOP {money(result.monthlyPayment)}。</li>
          <li>第一期利息是本金乘月利率，得 MOP {money(result.schedule[0].interest)}。由供款扣掉這期利息，歸還本金 MOP {money(result.schedule[0].principal)}；下期才用更新後的餘額計息。</li>
          <li>總利息 MOP {money(result.totalInterest)}；總還款 MOP {money(result.totalPaid)}。</li>
        </ol>
        <details><summary>查看逐月本金、利息與餘額（{result.periods} 期）</summary>
          <p>表內顯示至仙位；計算保留原精度，實際貸款可能調整最後一期。</p>
          <p>逐月攤還（MOP）</p>
          <ComparisonTable label="逐月攤還（MOP）" corner="月" stackBy="row" columns={['供款', '利息', '歸還本金', '期末欠款']}
            rows={result.schedule.map(row => ({ label: row.month, cells: [money(row.payment), money(row.interest), money(row.principal), money(row.balance)] }))}/>
        </details>
      </>}
    </div>}
  </>;
}
