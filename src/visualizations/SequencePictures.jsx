import React, { useState } from 'react';
import { arithmeticPicture, cancellationBlocks, formatIndex, geometricAreas, signedLogScale, visualFormat as f } from './proofModels.js';

function subtractNumber(left, right) {
  return `${left} ${right < 0 ? '+' : '−'} ${f(Math.abs(right))}`;
}

function Steps({ step, count, setStep, children }) {
  return <><div className="picture-steps"><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button><strong aria-live="polite">步驟 {step + 1} / {count}</strong><button type="button" disabled={step === count - 1} onClick={() => setStep(step + 1)}>下一步</button></div><p className="picture-caption" role="status">{children}</p></>;
}

export function ScaleToggle({ log, setLog }) {
  return <div className="picture-scale" role="group" aria-label="數值比例"><button type="button" aria-pressed={!log} onClick={() => setLog(false)}>線性比例</button><button type="button" aria-pressed={log} onClick={() => setLog(true)}>對數比例</button></div>;
}

export function ArithmeticPicture({ c }) {
  const [step, setStep] = useState(0);
  const p = c.params, model = arithmeticPicture(c.values, p.a);
  const { height, positive, unitBlocks } = model;
  const max = Math.max(1, ...c.values.map(Math.abs), Math.abs(height));
  const unit = 16, colWidth = 16, gap = 26, inset = 12;
  const barHeight = positive ? height * unit : max * unit * 2;
  const svgWidth = 2 * p.n * colWidth + gap + inset * 2;
  const svgHeight = barHeight + 42;
  const y = v => positive ? inset + (height - v) * unit : inset + (max - v) * unit;
  const offset = p.n * colWidth + gap;
  const captions = [
    `第 k 欄是 aₖ = a₁ + (k−1)d。${p.d >= 0 && p.a > 0 ? '深綠是首項，淺綠是逐次增加的部分。' : '公差為負時，後面的柱逐次變短；不把減少量畫成新增方塊。'}${unitBlocks ? '每格面積為 1。' : '使用等比例柱，不以整格冒充小數或負數。'}`,
    positive ? '右邊是同一組柱旋轉半周：順序倒轉，柱從上緣向下伸展。兩份總和相同。' : '右邊另列倒序的帶符號柱；本組不作旋轉面積拼圖。兩份總和相同。',
    positive ? `把倒轉的一份向左平移，每欄上、下恰好接合。每對高度都是 a₁+aₙ = ${f(height)}。` : '面積拼合只適用於全為正的項。本組含零或負項，保留帶符號的柱；請以下方數值核對表檢查首尾配對，不把負數當面積。',
    `倒寫配對有 ${p.n} 對：2Sₙ = n(a₁+aₙ)。代入：2S${formatIndex(p.n)} = ${p.n} × (${subtractNumber(f(p.a), -c.last)}) = ${f(2 * c.sum)}，所以 S${formatIndex(p.n)} = ${f(c.sum)}。`,
  ];
  const assembled = step >= 2 && positive;
  return <section className="sequence-picture" aria-label="等差階梯拼圖"><h4>兩份階梯，拼成長方形</h4><Steps {...{ step, setStep }} count={4}>{captions[step]}</Steps>
    <p className="picture-key">深綠：首項　淺綠：增加部分　藍色：倒轉的另一份</p>
    <svg className="sequence-picture-svg" style={{ width: svgWidth }} viewBox={`0 0 ${svgWidth} ${svgHeight}`} role="img" aria-label={positive ? `${p.n} 欄，每欄拼合高度 ${f(height)}` : '帶符號的等差數列比例柱'}>
      {!positive && <line x1={inset} x2={svgWidth - inset} y1={y(0)} y2={y(0)} stroke="#506350"/>}
      {unitBlocks ? model.cells.map((cell, i) => {
        const copy = cell.copy === 1;
        const x = inset + cell.col * colWidth + (copy && !assembled ? offset : 0);
        const row = copy ? height - cell.sourceRow - 1 : cell.row;
        return <rect key={i} className="picture-moving" x="0" y="0" width={colWidth - 2} height={unit - 1} style={{ transform: `translate(${x}px, ${inset + (height - row - 1) * unit}px)`, opacity: copy && step === 0 ? 0 : 1 }} fill={copy ? '#537fa4' : cell.base ? '#426d4c' : '#9ac384'}/>;
      }) : c.values.flatMap((v, i) => [0, 1].map(copy => {
        const col = copy ? p.n - i - 1 : i;
        const x = inset + col * colWidth + (copy && !assembled ? offset : 0);
        const top = positive && copy ? inset : Math.min(y(v), y(0));
        return <g key={`${i}:${copy}`} className="picture-moving" style={{ transform: `translate(${x}px, ${top}px)`, opacity: copy && step === 0 ? 0 : 1 }}><rect width={colWidth - 2} height={Math.abs(v) * unit} fill={copy ? '#537fa4' : v < 0 ? '#b66450' : '#426d4c'}/>{positive && !copy && p.d >= 0 && <rect width={colWidth - 2} height={(v - p.a) * unit} fill="#9ac384"/>}</g>;
      }))}
      {c.values.map((_, i) => <text key={i} x={inset + i * colWidth + 10} y={svgHeight - 8} textAnchor="middle">{i + 1}</text>)}
      {assembled && <rect x={inset - 1} y={inset - 1} width={p.n * colWidth} height={height * unit + 1} fill="none" stroke="#233f31" strokeWidth="2"/>}
    </svg>
    {!positive && <p className="picture-warning">本圖不是正面積證明；數值核對仍然成立。</p>}
    {step === 3 && <div className="proof-equation">2S{formatIndex(p.n)} = {p.n} × {height < 0 ? `(${f(height)})` : f(height)} = {f(2 * c.sum)}<br/>S{formatIndex(p.n)} = {f(c.sum)}</div>}
  </section>;
}

export function GeometricPicture({ c }) {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState(false);
  const p = c.params, area = p.a > 0 && p.r > 0 && p.r < 1;
  const term = Math.min(step + 1, p.n), sum = c.values.slice(0, term).reduce((a, b) => a + b, 0);
  const limit = Math.abs(p.r) < 1 ? p.a / (1 - p.r) : null;
  const { pieces, remaining } = geometricAreas(term, p.r);
  const scale = signedLogScale(c.values), values = log ? c.values.map(scale.map) : c.values;
  const max = Math.max(1e-20, ...values.map(Math.abs));
  const blocks = cancellationBlocks(c.values, p.r), cancel = step >= p.n + 2;
  const count = p.n + 4;
  const power = exponent => exponent === 1 ? '' : formatIndex(exponent, 'superscript');
  const indexedSum = `S${formatIndex(p.n)}`;
  const equation = `(${subtractNumber('1', p.r)}) × ${indexedSum} = ${subtractNumber(f(p.a), p.a * p.r ** p.n)}`;
  const caption = step < p.n ? `加入第 ${term} 項 a${formatIndex(term)} = ${f(c.values[term - 1])}；S${formatIndex(term)} = ${f(sum)}。${limit === null ? '本組不以收斂面積解釋。' : `剩餘尾和 a₁r${power(term)}/(1−r) = ${f(p.a * p.r ** term / (1 - p.r))}。`}`
    : step === p.n ? '把有限和的每一項畫成一塊。這些等寬標記代表代數項，不代表相等的面積。'
      : step === p.n + 1 ? '第二行每項乘 r，向右錯開一格；中間同一欄的數值相同。'
        : step === p.n + 2 ? '用上行減下行：中間同值成對抵消，只留下首項與末端的負項。'
          : p.r === 1 ? `r=1 時不可除以 1−r；直接相加 ${indexedSum} = ${p.n} × ${p.a < 0 ? `(${f(p.a)})` : f(p.a)} = ${f(c.sum)}。` : `(1−r)Sₙ = a₁−a₁rⁿ；代入：${equation}，所以 ${indexedSum} = ${f(c.sum)}。`;
  return <section className="sequence-picture" aria-label="等比圖像推導"><h4>{area ? '逐次切分，同一個整體' : '觀察每一項的大小與正負'}</h4><Steps {...{ step, setStep }} count={count}>{caption}</Steps>
    {area ? <><p>整個正方形代表 S∞ = {f(limit)}。每次取剩餘面積的 1−r = {f(1 - p.r)}，交替直切、橫切；虛線區尚未填入。</p><svg className="sequence-picture-svg area-picture" viewBox="0 0 300 300" role="img" aria-label={`前 ${term} 項面積及剩餘部分`}>
      {pieces.map(piece => <rect key={piece.k} className="picture-moving" x={piece.x * 280 + 10} y={piece.y * 280 + 10} width={piece.width * 280} height={piece.height * 280} fill={piece.k % 2 ? '#537fa4' : '#85ac6b'} stroke="white" strokeWidth="1"><title>第 {piece.k} 項：{f(c.values[piece.k - 1])}</title></rect>)}
      <rect x={remaining.x * 280 + 10} y={remaining.y * 280 + 10} width={remaining.width * 280} height={remaining.height * 280} fill="none" stroke="#675a3b" strokeDasharray="3 2"/>
    </svg></> : <><ScaleToggle {...{ log, setLog }}/>{log && <p>柱長為 {subtractNumber('log₁₀|aₖ|', scale.origin)} + 1；零值畫在軸上，正負仍以上下與顏色區分。這不是面積。</p>}
      <svg className="sequence-picture-svg" viewBox="0 0 360 260" role="img" aria-label="等比數列帶符號比例柱"><line x1="10" x2="350" y1="125" y2="125" stroke="#53644e"/>{values.map((v, i) => {
        const h = Math.abs(v) / max * 95, w = 320 / p.n;
        return <g key={i} opacity={i < term ? 1 : 0.15} className="picture-moving"><rect x={20 + i * w} y={v >= 0 ? 125 - h : 125} width={w - 4} height={h} fill={v < 0 ? '#b66450' : '#426d4c'}/><text x={20 + i * w + (w - 4) / 2} y="248" textAnchor="middle">{i + 1}</text><title>a{formatIndex(i + 1)} = {f(c.values[i])}</title></g>;
      })}</svg></>}
    {p.r < 0 && p.r > -1 && <AlternatingSums values={c.values.slice(0, term)} limit={limit}/>}
    {p.a <= 0 && p.r > 0 && p.r < 1 && <p>首項非正，本組不用正面積模型；改用帶符號柱與精確數值。</p>}
    <p className="picture-key">目前 a{formatIndex(term)} = {f(c.values[term - 1])}；S{formatIndex(term)} = {f(sum)}{limit !== null && `；S∞ = ${f(limit)}`}</p>
    {step >= p.n && <><h4>錯位相減圖：同欄同值才抵消</h4><p>綠：原和；藍：乘 r 的一行。標記等寬，數值請看下方核對表。</p><svg className="sequence-picture-svg" style={{ width: (p.n + 1) * 28 + 20 }} viewBox={`0 0 ${(p.n + 1) * 28 + 20} 100`} role="img" aria-label="錯位後中間項成對抵消">
      {blocks.map((block, i) => <g key={i} className="picture-moving" style={{ transform: `translate(${10 + (block.row === 1 && step === p.n ? block.col - 1 : block.col) * 28}px, ${10 + block.row * 42}px)`, opacity: block.row === 1 && step === p.n ? 0 : cancel && block.cancels ? 0.12 : 1 }}><rect width="24" height="28" fill={block.row ? '#537fa4' : '#426d4c'}/><text x="12" y="19" textAnchor="middle" fill="white">{block.col + 1}</text></g>)}
    </svg><p>{cancel ? `留下 a₁ = ${f(p.a)} 與 −a₁r${power(p.n)} = ${f(-p.a * p.r ** p.n)}。` : '塊上的數字是項的下標；下行乘 r 後，下標向後一位。'}</p></>}
    {step === count - 1 && <div className="proof-equation">{p.r === 1 ? `${indexedSum} = ${f(c.sum)}` : equation}<br/>{indexedSum} = {f(c.sum)}</div>}
  </section>;
}

function AlternatingSums({ values, limit }) {
  let sum = 0;
  const sums = values.map(v => (sum += v)), max = Math.max(1e-20, Math.abs(limit), ...sums.map(Math.abs));
  const y = v => 140 - v / max * 110;
  return <><p>{values.every(v => v === 0) ? '首項為零，所有部分和都在零的位置，沒有交替振幅。' : '部分和折線在極限兩側交替靠近；'}虛線是 S∞ = {f(limit)}。</p><svg className="sequence-picture-svg" viewBox="0 0 360 270" role="img" aria-label="交錯等比部分和與極限"><line x1="20" x2="340" y1={y(limit)} y2={y(limit)} stroke="#9c6437" strokeDasharray="5 4"/><polyline points={sums.map((v, i) => `${30 + i * 300 / Math.max(1, sums.length - 1)},${y(v)}`).join(' ')} fill="none" stroke="#426d4c" strokeWidth="2"/>{sums.map((v, i) => <circle key={i} cx={30 + i * 300 / Math.max(1, sums.length - 1)} cy={y(v)} r="4" fill="#426d4c"><title>S{formatIndex(i + 1)} = {f(v)}</title></circle>)}</svg></>;
}
