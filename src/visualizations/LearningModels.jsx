import React, { useState } from 'react';
import { editSquareWorkspace } from '../learning/guided.js';
import { calculate } from '../math.js';
import { annuityLedger, squareSumCells, squareSumTower, visualFormat as f } from './proofModels.js';
import { subscript } from './mathNotation.js';
import './visualizations.css';

const colors = ['#658569', '#d19a5b', '#719eb6', '#a28ab6', '#b57970', '#8b9859'];
const color = term => colors[(term - 1) % colors.length];

function SquareTower({ placed, n }) {
  const cubes = squareSumTower(placed);
  const dx = 18, dy = 9, dz = 20;
  const width = Math.max(220, n * dx * 2 + 44);
  const height = Math.max(170, n * (dy * 2 + dz) + 38);
  const base = (height - n * dy * 2 + n * dz) / 2;
  const project = (x, y, z) => [width / 2 + (x - y) * dx, base + (x + y) * dy - z * dz];
  const face = points => points.map(([x, y, z]) => project(x, y, z).join(',')).join(' ');
  return <svg className="square-tower-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`平方塔共 ${cubes.length} 個單位立方體；${placed.slice().sort((a, b) => b - a).map(k => `${k} 乘 ${k} 的一層有 ${k * k} 個`).join('；')}`}>
    <ellipse cx={width / 2} cy={base + n * dy} rx={Math.max(48, n * dx)} ry={Math.max(12, n * dy)} fill="#dfe6d6" opacity=".65"/>
    {!cubes.length && <g><path d={`M ${width / 2} ${base} l ${n * dx} ${n * dy} l ${-n * dx} ${n * dy} l ${-n * dx} ${-n * dy} Z`} fill="none" stroke="#a9bba1" strokeDasharray="4 4"/><text x={width / 2} y={height - 12} textAnchor="middle">放入正方形，讓平方塔長高</text></g>}
    {cubes.map(({ term, unit, x, y, z }) => <g key={`${term}:${unit}`} className="square-tower-cube" style={{ '--layer-color': color(term) }}>
      <title>{term}×{term} 平方層的第 {unit + 1} 個單位方塊</title>
      <polygon points={face([[x,y+1,z+1],[x+1,y+1,z+1],[x+1,y+1,z],[x,y+1,z]])} className="tower-front"/>
      <polygon points={face([[x+1,y,z+1],[x+1,y+1,z+1],[x+1,y+1,z],[x+1,y,z]])} className="tower-side"/>
      <polygon points={face([[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]])} className="tower-top"/>
    </g>)}
  </svg>;
}

// Each square keeps its unit size when its cells move into the counting tray.
export function SquareSumExplorer({ c, setSelected = () => {}, onParams, onComplete, workspace, onWorkspaceChange }) {
  const n = c.params.n;
  const index = subscript(n);
  const [localWorkspace, setLocalWorkspace] = useState({});
  const { placed = [], answers = { term: '', sum: '' }, checked = false, representation = 'tower' } =
    onWorkspaceChange ? workspace ?? {} : localWorkspace;
  const update = onWorkspaceChange ?? setLocalWorkspace;
  const cells = squareSumCells(placed);
  const complete = placed.length === n;
  const missing = Array.from({ length: n }, (_, i) => i + 1).filter(k => !placed.includes(k));
  function toggle(term) {
    const next = placed.includes(term) ? placed.filter(k => k !== term) : [...placed, term];
    invalidate({ placed: next });
    setSelected(term - 1);
  }
  function invalidate(patch) {
    update(current => editSquareWorkspace(current, patch));
    onComplete?.({ correct: false });
  }
  function check() {
    update(current => ({ ...current, checked: true }));
    onComplete?.({ correct: complete && answers.term.trim() !== '' && answers.sum.trim() !== '' && Number(answers.term) === c.last && Number(answers.sum) === c.sum });
  }
  function edit(key, value) { invalidate({ answers: { ...answers, [key]: value } }); }
  return <div className="square-workbench" data-proof="square-sum-workbench">
    <div className="proof-heading"><h3>把完整的正方形，放進總和裡</h3><p>第 {n} 項只有一個 {n}×{n} 正方形；前 {n} 項的和，要把每個正方形都算一次。</p></div>
    {n !== 3 && onParams && <button className="proof-action" onClick={() => onParams({ n: 3 })}>先用 1²＋2²＋3² 試一次</button>}
    <div className="learning-step-label"><b>1</b><span>點選正方形放入；再點一次可取回</span></div>
    <div className="square-piece-bank" aria-label="可放入總和的完整正方形">{c.values.map((value, i) => {
      const term = i + 1, included = placed.includes(term);
      return <button type="button" key={term} className={included ? 'square-piece is-placed' : 'square-piece'} aria-pressed={included} aria-label={`${included ? '取回' : '放入'}第 ${term} 個正方形，${term} 乘 ${term} 等於 ${value} 格`} draggable={!included} onDragStart={e => { e.dataTransfer.setData('text/plain', String(term)); e.dataTransfer.effectAllowed = 'move'; }} onClick={() => toggle(term)}>
        <strong>a<sub>{term}</sub> = {term}² = {value}</strong>
        <span className="square-piece-grid" style={{ gridTemplateColumns: `repeat(${term}, 18px)` }} aria-hidden="true">{Array.from({ length: value }, (_, cell) => <i key={cell} style={{ background: included ? 'transparent' : color(term), borderColor: color(term) }}/>)}</span>
        <small>{included ? '已移入 · 點此取回' : '點此放入 ↓'}</small>
      </button>;
    })}</div>
    <div className="learning-step-label"><b>2</b><span>同一批單位，可以平面點算，也可以逐層堆疊</span></div>
    <div className="square-counting-tray" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const term = Number(e.dataTransfer.getData('text/plain')); if (Number.isInteger(term) && term >= 1 && term <= n && !placed.includes(term)) toggle(term); }}>
      <div className="square-tray-heading"><strong>{complete ? `前 ${n} 項的和 S${index}` : '已放入的單位小計'}</strong><output aria-live="polite">{cells.length} {representation === 'tower' ? '個方塊' : '格'}</output></div>
      <div className="square-model-switch" role="group" aria-label="平方和的視覺表示"><button aria-pressed={representation === 'tower'} onClick={() => update(current => ({ ...current, representation: 'tower' }))}>立體：堆成平方塔</button><button aria-pressed={representation === 'flat'} onClick={() => update(current => ({ ...current, representation: 'flat' }))}>平面：十格一排點算</button></div>
      {representation === 'tower' ? <><SquareTower placed={placed} n={n}/><p className="proof-scale-note">延伸一步：把每格加高 1，變成單位立方體。{cells.length} 平方單位對應 {cells.length} 立方單位；數字相同，面積與體積的意義不同。</p><div className="tower-layer-legend">{placed.slice().sort((a,b) => b-a).map(k => <span key={k}><i style={{ background: color(k) }}/>{k}×{k} 的一層：{k*k} 個</span>)}</div></> : <>
      <div className="proof-scroll" role="region" tabIndex="0" aria-label="每排十格的計數盤，每格面積與上方正方形相同">
        <svg className="square-counting-svg" width="216" height={Math.max(74, Math.ceil(cells.length / 10) * 20 + 28)} role="img" aria-label={`每排十格，共 ${Math.floor(cells.length / 10)} 整排及 ${cells.length % 10} 格，總共 ${cells.length} 格`}>
          {Array.from({ length: Math.max(30, Math.ceil(cells.length / 10) * 10) }, (_, i) => <rect key={`empty-${i}`} x={8 + i % 10 * 20} y={8 + Math.floor(i / 10) * 20} width="18" height="18" rx="2" fill="none" stroke="#cbd8c5" strokeDasharray="2 2"/>)}
          {cells.map(cell => <rect key={`${cell.term}-${cell.unit}`} className="counted-cell" x={8 + cell.col * 20} y={8 + cell.row * 20} width="18" height="18" rx="2" fill={color(cell.term)}><title>來自第 {cell.term} 個正方形</title></rect>)}
        </svg>
      </div>
      <p className="tray-counting-caption">{Math.floor(cells.length / 10)} 整排 × 10 ＋ {cells.length % 10} 格 = {cells.length} 格</p>
      <p className="proof-scale-note">每格都是 1 平方單位；十格一排只是方便點算，不是平方和公式。</p>
      </>}
      <div className="learning-inline-actions"><button className="proof-action" disabled={!missing.length} onClick={() => toggle(missing[0])}>放入下一個正方形</button><button className="proof-action" disabled={!placed.length} onClick={() => invalidate({ placed: [] })}>全部取回</button></div>
      <p className="proof-reason" role="status">{complete ? `${placed.slice().sort((a, b) => a - b).map(k => `${k}²`).join(' ＋ ')} = ${c.sum}。所有完整正方形各計一次，現在才是 S${index}。` : `還缺第 ${missing.join('、')} 個正方形；目前的小計不是 S${index}。`}</p>
    </div>
    <div className="learning-step-label"><b>3</b><span>不用背符號，指出它在數哪一幅圖</span></div>
    <div className="visual-check">
      <div className="visual-check-inputs"><label>最後一個正方形：a<sub>{n}</sub><input aria-label="最後一個正方形的格數" inputMode="numeric" value={answers.term} onChange={e => edit('term', e.target.value)}/></label><label>全部正方形：S<sub>{n}</sub><input aria-label="所有正方形的總格數" inputMode="numeric" value={answers.sum} onChange={e => edit('sum', e.target.value)}/></label></div>
      <button className="proof-action proof-primary" onClick={check}>用圖形檢查我的解釋</button>
      {checked && <p className="visual-check-feedback" role="status">{!answers.term.trim() || !answers.sum.trim() ? '先填兩個格數，再用上方方塊核對。' : Number(answers.term) === c.last && Number(answers.sum) === c.sum ? !complete ? '數字正確；現在把缺少的正方形放進計數盤，用完整拼圖支持你的答案。' : n === 1 ? '對：只有一個正方形，a₁ 和 S₁ 都是 1；數值相同，但一個表示單項，一個表示總和。' : `對：a${index} 只數最後一個 ${n}×${n}；S${index} 數的是全部 ${n} 個正方形。改變 n，再試一次。` : Number(answers.sum) === c.last && n > 1 ? `你把最後一個正方形的 ${c.last} 格當作總和了；前面的正方形還在，請把它們一起放進計數盤。` : `先分清：a${index} 只看標示 a${index} 的正方形；S${index} 要包含第 1 到第 ${n} 個。可取回再逐個放入，用計數盤核對。`}</p>}
    </div>
    <details className="proof-data"><summary>從拼圖走向一般公式</summary><p>這個操作驗證了目前的格數，還不是對所有 n 的證明。平方和公式是 Sₙ = n(n＋1)(2n＋1)÷6；完整推導請接著看本章「推導與例題」。</p></details>
  </div>;
}

export function SquareSumLesson({ n = 3, onComplete, workspace, onWorkspaceChange }) {
  const c = calculate('square', { n });
  return <div className="lab-visualizations embedded-square-lesson"><SquareSumExplorer key={c.params.n} c={c} onComplete={onComplete}
    workspace={workspace} onWorkspaceChange={onWorkspaceChange}/></div>;
}

export function AnnuityTimeline({ c }) {
  const { payment, rate, n, due } = c.params;
  const [year, setYear] = useState(0);
  const ledger = annuityLedger(payment, rate / 100, n, due);
  const row = ledger[year];
  return <div className="learning-diagram annuity-learning">
    <h4>親自走過一年：錢是在何時存入？</h4>
    <p>先模擬帳戶逐年累積；下方的存款長條，則把各筆錢搬到同一個第 {n} 年終點。</p>
    <div className="annuity-year-picker" aria-label="選擇帳戶的年末時間">{ledger.map(entry => <button key={entry.year} aria-pressed={entry.year === year} onClick={() => setYear(entry.year)}>{entry.year === 0 ? '起點' : `第 ${entry.year} 年末`}</button>)}</div>
    <div className="annuity-year-result" aria-live="polite"><span>{year === 0 ? '尚未開始第一年的存款及生息' : `第 ${year} 年年末帳戶結餘`}</span><strong>${f(row.balance)}</strong></div>
    {year > 0 && <div className="annuity-flow"><span>年初承接<strong>${f(row.opening)}</strong></span><b aria-hidden="true">→</b>{due ? <><span>先存入<strong>＋${f(payment)}</strong></span><b aria-hidden="true">→</b><span>整年生息<strong>＋${f(row.interest)}</strong></span></> : <><span>先計利息<strong>＋${f(row.interest)}</strong></span><b aria-hidden="true">→</b><span>年末存入<strong>＋${f(payment)}</strong></span></>}</div>}
    <div className="learning-inline-actions"><button className="proof-action" disabled={year === 0} onClick={() => setYear(year - 1)}>回看上一年</button><button className="proof-action proof-primary" disabled={year === n} onClick={() => setYear(year + 1)}>過一年，看看變化</button></div>
    <p className="proof-reason">{year === 0 ? `這是第 1 年操作前的起點；接下來${due ? '先存款，再生息' : '先計利息，再在年末存款'}。` : due ? `本年的利息基數是 $${f(row.opening)}＋$${f(payment)}；新存款也生息一年。` : `本年的利息只來自年初的 $${f(row.opening)}；這年末才存入的 $${f(payment)} 尚未生息。`}</p>
    <div className="learning-measures"><span>到此時存入的本金<strong>${f(payment * year)}</strong></span><span>到此時累積的利息<strong>${f(row.balance - payment * year)}</strong></span></div>
  </div>;
}
