import React, { useEffect, useId, useRef, useState } from 'react';
import { arithmeticPartialSum, calculate } from '../math.js';
import { chartDomain, geometricTail, signedLogScale, visualFormat as f } from './proofModels.js';
import { ScaleToggle } from './SequencePictures.jsx';
import { SquareProof, TriangleProof, ArithmeticProof, GeometricProof, FibonacciProof, AnnuityProof } from './ProofScenes.jsx';

export function ShapeView({ id, c, proof, setProof, selected, setSelected }) {
  const props = { c, selected, setSelected };
  if (id === 'square') return <SquareProof {...props}/>;
  if (id === 'triangular') return <TriangleProof c={c} proof={proof} setProof={setProof}/>;
  if (id === 'arithmetic') return <ArithmeticProof {...props}/>;
  if (id === 'geometric') return <GeometricProof c={c}/>;
  if (id === 'fibonacci') return <FibonacciProof {...props}/>;
  return <AnnuityProof {...props}/>;
}

export function SequenceChart({ values, selected, setSelected, cumulative = false, annuityYear = null, domainValues = values, limit = null, allowLog = false }) {
  const [fixed, setFixed] = useState(false);
  const [connect, setConnect] = useState(false);
  const [log, setLog] = useState(false);
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(700);
  useEffect(() => {
    if (!allowLog || !chartRef.current) return;
    const observer = new ResizeObserver(([entry]) => setChartWidth(Math.max(260, entry.contentRect.width)));
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [allowLog]);
  const titleId = useId();
  const valid = Number.isInteger(selected) && selected >= 0 && selected < values.length ? selected : null;
  const reference = [...(fixed ? domainValues : values), ...(limit === null ? [] : [limit])];
  const logarithm = signedLogScale(reference);
  const transform = allowLog && log ? logarithm.map : v => v;
  const [min, max] = chartDomain(reference.map(transform));
  const left = allowLog ? 58 : 92, right = allowLog ? chartWidth - 28 : 650, top = 35, bottom = 250;
  const axisY = v => bottom - (v - min) / (max - min) * (bottom - top);
  const y = v => axisY(transform(v));
  const x = i => values.length === 1 ? (left + right) / 2 : left + i * (right - left) / (values.length - 1);
  const unit = annuityYear === null ? '項' : '筆';
  const title = annuityYear !== null ? `第 ${annuityYear} 年年末的${cumulative ? '存款終值小計' : '各筆存款終值'}` : cumulative ? '部分和 Sₖ' : '單項 aₖ';
  return <div className="proof-chart">
    {allowLog && <><ScaleToggle {...{ log, setLog }}/>{log && <p className="picture-caption">縱軸為帶符號的對數距離：正值向上、負值向下；距離 = log₁₀|aₖ| − ({logarithm.origin}) + 1。零值在軸上；刻度顯示距離，不是原數值，精確值見下表。</p>}</>}
    <div className="proof-chart-options"><label><input type="checkbox" checked={fixed} onChange={e => setFixed(e.target.checked)}/>固定為 12 {unit}的縱軸比例</label><label><input type="checkbox" checked={connect} onChange={e => setConnect(e.target.checked)}/>連線輔助觀察</label></div>
    <p className="proof-scale-note">{fixed ? annuityYear !== null ? '縱軸參照同參數的 12 年模型；資料仍在本次終點估值。' : '縱軸按相同參數的 12 項固定，方便逐項比較。' : '縱軸依目前數值自動調整；高度只在本圖內比較。'}數列只定義整數位置，連線不代表中間另有項。</p>
    <div ref={chartRef} className={`proof-scroll ${allowLog ? 'picture-responsive-chart' : ''}`} tabIndex="0" role="region" aria-label={allowLog ? '隨寬度調整的數列圖表' : '可左右捲動的數列圖表'}>
      <svg className="proof-chart-svg" viewBox={`0 0 ${allowLog ? chartWidth : 700} 300`} role="group" aria-labelledby={titleId}>
        <title id={titleId}>{title}；橫軸為{annuityYear === null ? '項數 k' : '存款順序 k'}</title>
        <text x="12" y="18" className="proof-svg-label">{allowLog && log ? '對數距離' : annuityYear !== null ? 'FV ($)' : cumulative ? 'Sₖ' : 'aₖ'}</text>
        {Array.from({ length: 5 }, (_, i) => { const v = min + i * (max - min) / 4; return <g key={i}><line x1={left} x2={right} y1={axisY(v)} y2={axisY(v)} className="proof-gridline"/><text x={left - 10} y={axisY(v) + 4} textAnchor="end" className="proof-svg-label">{allowLog && log ? Number(v.toPrecision(3)).toLocaleString('zh-Hant') : f(v)}</text></g>; })}
        <line x1={left} x2={right} y1={y(0)} y2={y(0)} className="proof-zero-line"/>
        {limit !== null && <g><line x1={left} x2={right} y1={y(limit)} y2={y(limit)} className="proof-limit-line"/><text x={right} y={y(limit) - 10} textAnchor="end" className="proof-svg-label">極限 S∞ = {f(limit)}</text></g>}
        {connect && values.length > 1 && <polyline points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} className="proof-chart-line"/>}
        {values.map((v, i) => <g key={i} className="proof-chart-point" role="button" tabIndex="0" aria-pressed={valid === i} aria-label={`第 ${i + 1} ${unit}${cumulative ? '累計' : ''}：${f(v)}`} onClick={() => setSelected(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(i); } }}>
          <rect x={x(i) - 22} y={y(v) - 22} width="44" height="44" fill="transparent"/>
          <circle cx={x(i)} cy={y(v)} r={valid === i ? 7 : 5} className={valid === i ? 'proof-chart-selected' : 'proof-chart-dot'} style={allowLog && v < 0 ? { fill: '#b66450' } : undefined}/>
          <text x={x(i)} y={bottom + 25} textAnchor="middle" className="proof-svg-label">{i + 1}</text>
          {i === valid && <text x={x(i)} y={y(v) - 14} textAnchor="middle" className="proof-chart-value">{f(v)}</text>}
        </g>)}
        <text x={allowLog ? chartWidth - 12 : 678} y={bottom + 25} className="proof-svg-label">k</text>
      </svg>
    </div>
    <p className="proof-chart-detail" role="status">{valid === null ? '點選圖點，或在下方數值表選擇一項。' : `第 ${valid + 1} ${unit}${cumulative ? '累計' : ''}：${f(values[valid])}`}</p>
    <details className="proof-data"><summary>數值表：精確選點與鍵盤操作</summary><div className="proof-term-picker">{values.map((value, i) => <button key={i} aria-pressed={valid === i} onClick={() => setSelected(i)}><span>{cumulative ? 'S' : 'a'}<sub>{i + 1}</sub></span><strong>{f(value)}</strong></button>)}</div><p>顯示至多 7 位有效數字；極小非零數用科學記號，不當作 0。</p></details>
  </div>;
}

export function SumView({ id, c, selected, setSelected }) {
  const k = (selected ?? c.params.n - 1) + 1;
  let total = 0;
  const sums = c.values.map((v, i) => id === 'arithmetic' ? arithmeticPartialSum(c.params.a, c.params.d, i + 1) : (total += v));
  const reference = calculate(id, { ...c.params, n: 12 }).values;
  let running = 0;
  const domainValues = reference.map((v, i) => id === 'arithmetic' ? arithmeticPartialSum(c.params.a, c.params.d, i + 1) : (running += v));
  if (id === 'square' || id === 'triangular') return <div className="proof-scene" data-proof={`${id}-sum`}>
    <div className="proof-heading"><h3>加的是完整圖形，不是多加一排</h3><p>選第 k 個圖形，只累加到這裡；留意 aₖ 與 Sₖ 是兩個不同的量。</p></div>
    <div className="proof-sum-shapes">{c.values.map((value, i) => <button key={i} aria-pressed={k === i + 1} onClick={() => setSelected(i)} className={i < k ? 'proof-included' : ''}>
      <span>a<sub>{i + 1}</sub> = {value}</span><div className="proof-mini-grid" style={{ gridTemplateColumns: `repeat(${i + 1}, 10px)` }} aria-hidden="true">{Array.from({ length: (i + 1) ** 2 }, (_, j) => <i key={j} style={id === 'triangular' && j % (i + 1) > Math.floor(j / (i + 1)) ? { visibility: 'hidden' } : {}}/>)}</div>
      <small>{i < k ? '計入總和' : '尚未計入'}</small>
    </button>)}</div>
    <div className="proof-equation" role="status">S{k} = {c.values.slice(0, k).map(f).join(' + ')} = {f(sums[k - 1])}</div>
    <p className="proof-reason">{k === 1 ? '只有一項時，S₁ = a₁ = 1；符號意義不同，數值此時相同。' : `第 ${k} 項 a${k} = ${c.values[k - 1]}；前 ${k} 項和 S${k} = ${sums[k - 1]}，要數所有已計入的完整圖形。`}</p>
  </div>;
  const limit = id === 'geometric' && (c.params.a === 0 || Math.abs(c.params.r) < 1) ? (c.params.a === 0 ? 0 : c.params.a / (1 - c.params.r)) : null;
  const extendedFib = id === 'fibonacci' ? calculate(id, { ...c.params, n: 12 }).values : [];
  // The visible model stops at 12, but the telescoping proof needs F₁₃ and F₁₄.
  if (id === 'fibonacci') while (extendedFib.length < c.params.n + 2) extendedFib.push(extendedFib.at(-1) + extendedFib.at(-2));
  return <div className="proof-scene" data-proof={`${id}-sum`}>
    <div className="proof-heading"><h3>{id === 'annuity' ? '同一個終點，逐筆加總' : '單項與部分和，分開觀察'}</h3><p>{id === 'annuity' ? `全部以 t=${c.params.n} 估值；橫軸是第 k 筆，不是第 k 年的帳戶結餘。` : '新增一項 aₖ，就是部分和 Sₖ 比 Sₖ₋₁ 改變的量。'}</p></div>
    <SequenceChart values={sums} selected={selected} setSelected={setSelected} cumulative annuityYear={id === 'annuity' ? c.params.n : null}
      domainValues={domainValues} limit={limit}/>
    <div className="proof-equation">{id === 'annuity' ? `t=${c.params.n} 的 ${k} 筆存款終值小計` : `S${k}`} = {f(sums[k - 1])}</div>
    {id === 'geometric' && <p className="proof-reason">{limit === null ? '首項非零且 |r|≥1：沒有收斂的無窮和，但本圖的有限部分和仍有效。' : c.params.a === 0 ? '全零數列：任何公比的部分和都一直是 0。' : `極限 S∞ = ${f(limit)}；尾和 S∞ − S${k} = a₁r^${k}/(1−r) = ${f(geometricTail(c.params.a, c.params.r, k))}。虛線是極限，不是第 13 項。`}</p>}
    {id === 'fibonacci' && <div className="proof-fib-sum"><h4>把遞推式改寫成相鄰兩項的差</h4><div className="proof-scroll" tabIndex="0" role="region" aria-label="斐波那契求和抵消證明"><div className="proof-telescope">{c.values.slice(0, k).map((v, i) => <span key={i}>{i > 0 ? ' + ' : ''}(<b className={i < k - 1 ? 'proof-cancel' : ''}>F{i + 3}</b> − <b className={i > 0 ? 'proof-cancel' : ''}>F{i + 2}</b>)</span>)}</div></div><p>中間的正負項相消，只剩 F{k + 2} − F₂ = {extendedFib[k + 1]} − 1 = {f(sums[k - 1])}。</p></div>}
  </div>;
}
