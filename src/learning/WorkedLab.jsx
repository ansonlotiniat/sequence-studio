import React, { useState } from 'react';
import { workedComputation } from './worked.js';
import FinanceLab from './FinanceLab.jsx';

const count = ['n', '項數 n', 1, 12, 1];
const first = ['a', '首項 a₁', -20, 20, 'any'];
const fields = {
  square: [count],
  arithmetic: [count, first, ['d', '公差 d', -10, 10, 'any'], ['target', '反推位置用的項值', -1000000, 1000000, 'any']],
  geometric: [count, first, ['r', '公比 r', -3, 3, 'any']],
  triangular: [count, ['target', '反推層數用的點數', 1, 1000000, 1]],
  fibonacci: [count, ['first', '第一項', -99, 99, 1], ['second', '第二項', -99, 99, 1]],
  annuity: [['n', '年數 n', 1, 12, 1], ['payment', '每年存款（MOP）', 0, 100000, 'any'],
    ['rate', '年利率（%）', 0, 30, 'any'], ['target', '反推用的目標終值（MOP）', 0, 10000000, 'any']],
};
const visual = { square: 'sum', arithmetic: 'graph', geometric: 'sum', triangular: 'shape', fibonacci: 'graph', annuity: 'shape' };
const targets = { arithmetic: 31, triangular: 15, annuity: 3000 };
const financeModes = [['fv', '終值'], ['pv', '現值'], ['loan', '每月供款']];

export default function WorkedLab({ id, startingParams, onShowExperiment, onWorked }) {
  const [draft, setDraft] = useState({ first: 1, second: 1, target: targets[id], ...startingParams });
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('fv');

  function edit(key, value) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setResult(null);
  }

  function compute(event) {
    event.preventDefault();
    const params = { ...draft };
    for (const [key] of fields[id]) params[key] = Number(draft[key]);
    setResult({ params, steps: workedComputation(id, params) });
    onWorked();
  }

  const customRecurrence = id === 'fibonacci' && result && (result.params.first !== 1 || result.params.second !== 1);
  return <section className="lesson-card custom-worked" id="lesson-worked" tabIndex="-1">
    <span className="eyebrow">03 · 動手算，換成你的數字</span>
    <h3>用自訂數據逐步演算</h3>
    {id === 'annuity' && <div className="lesson-actions finance-modes" role="group" aria-label="年金演算情境">
      {financeModes.map(([value, label]) => <button type="button" key={value} className="outline-button"
        aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}
    </div>}
    {mode === 'fv' ? <>
    <p>先預測，再輸入一組數據。第一次只改一個數，比較哪一步、哪個量跟著變。</p>
    <form onSubmit={compute}>
      <div className="worked-fields">
        {fields[id].map(([key, label, min, max, step]) => <label key={key}>
          {label}<input type="number" required value={draft[key]} min={min} max={max} step={step}
            onChange={event => edit(key, event.target.value)}/>
        </label>)}
        {id === 'annuity' && <label>存款時點<select value={draft.due ? 'due' : 'ordinary'}
          onChange={event => edit('due', event.target.value === 'due')}>
          <option value="ordinary">每年期末</option><option value="due">每年期初</option>
        </select></label>}
      </div>
      <button className="primary-button">顯示逐步計算</button>
    </form>
    <div aria-live="polite">
      {result && <div className="worked-solution">
        <strong>這組數據的代入與核對</strong>
        <ol>{result.steps.map(step => <li key={step}>{step}</li>)}</ol>
        {customRecurrence ? <p>圖示只展示標準起點 1、1；上面的逐項計算使用你輸入的起點。</p> :
          <button type="button" className="outline-button" onClick={() =>
            onShowExperiment({ params: result.params, view: visual[id] })}>在實驗用這組數據</button>}
      </div>}
    </div>
    </> : <FinanceLab key={mode} mode={mode} onWorked={onWorked} />}
  </section>;
}
