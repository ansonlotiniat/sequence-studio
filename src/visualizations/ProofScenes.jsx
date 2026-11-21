import React, { useEffect, useState } from 'react';
import { squareTiles, triangleCopies, shiftedTerms, proofFormat, visualFormat as f } from './proofModels.js';
import { ArithmeticPicture, GeometricPicture } from './SequencePictures.jsx';
import { SquareSumExplorer, AnnuityTimeline } from './LearningModels.jsx';
import ComparisonTable from '../ComparisonTable.jsx';
import { mathNotation } from './mathNotation.js';

export function Legend({ items }) {
  return <ul className="proof-legend" aria-label="圖例">{items.map(([color, text]) => <li key={text}><i className={`proof-key ${color}`} aria-hidden="true"/>{mathNotation(text)}</li>)}</ul>;
}

export function TermPicker({ values, selected, onSelect, prefix = 'a', sources = false, formatValue = f }) {
  return <div className="proof-term-picker" aria-label="選擇要觀察的項">{values.map((value, i) => <button key={i} type="button" aria-pressed={selected === i} onClick={() => onSelect(i)} className={sources && selected >= 2 ? i === selected - 2 ? 'source-a' : i === selected - 1 ? 'source-b' : '' : ''}>
    <span>{prefix}<sub>{i + 1}</sub></span><strong>{formatValue(value)}</strong>
    {sources && <small>{i === selected ? '觀察項' : selected >= 2 && i === selected - 2 ? '來源 A' : selected >= 2 && i === selected - 1 ? '來源 B' : '選此項'}</small>}
  </button>)}</div>;
}

function Equation({ children }) { return <div className="proof-equation" role="status">{React.Children.map(children, child => typeof child === 'string' ? mathNotation(child) : child)}</div>; }

export function SquareProof(props) {
  const [mode, setMode] = useState('sum');
  return <div>
    <div className="square-model-switch" role="group" aria-label="平方數的兩種問題">
      <button aria-pressed={mode === 'sum'} onClick={() => setMode('sum')}>平方和：拼完整正方形</button>
      <button aria-pressed={mode === 'growth'} onClick={() => setMode('growth')}>單項：看新增的 L 形</button>
    </div>
    {mode === 'sum' ? <SquareSumExplorer key={props.c.params.n} {...props}/> : <SquareGrowthProof {...props}/>}
  </div>;
}

function SquareGrowthProof({ c, selected, setSelected }) {
  const [split, setSplit] = useState(false);
  const k = (selected ?? c.params.n - 1) + 1;
  const old = (k - 1) ** 2, ring = 2 * k - 1;
  return <div className="proof-scene" data-proof="square">
    <div className="proof-heading"><h3>同一個單位，數出新的一圈</h3><p>先預測：邊長多 1，面積是多 1，還是多一圈？</p></div>
    <TermPicker values={c.values} selected={k - 1} onSelect={setSelected}/>
    <button className="proof-action" aria-pressed={split} onClick={() => setSplit(!split)}>{split ? '把 L 形接回去' : '拆開新增的 L 形'}</button>
    <div className="proof-scroll" tabIndex="0" role="region" aria-label="單位方塊圖，每格邊長保持相同">
      <svg className="proof-unit-svg" width={Math.max(260, k * 18 + 76)} height={k * 18 + 28} role="img" aria-label={`${old} 個原有方塊，加 ${ring} 個 L 形方塊，等於 ${k * k}`}>
        {squareTiles(k).map(({ row, col, ring: isRing }) => <rect key={`${row}:${col}`} className={`proof-moving proof-fill-${isRing ? 'new' : 'base'}`} x={24 + col * 18} y={12 + row * 18} width="16" height="16" rx="2" style={{ transform: isRing && split ? 'translate(26px, 12px)' : 'translate(0, 0)' }}/>) }
      </svg>
    </div>
    <p className="proof-scale-note">每格 = 1 平方單位；增加項數不縮小方塊</p>
    <Legend items={[[ 'base', `原有 (${k} − 1)² = ${old} 格` ], [ 'new', `新增 ${k} + ${k - 1} = ${ring} 格` ]]}/>
    <Equation>{k}² = {old} + {ring} = {k * k}</Equation>
    <p className="proof-reason">底邊 {k} 格，右邊扣除角落後 {k - 1} 格；角落不能數兩次。{k === 1 ? '起點視為 0² = 0。' : `所以新增量是 2 × ${k} − 1，不是 ${k}。`}</p>
  </div>;
}

export function TriangleProof({ c, proof, setProof }) {
  const [adjacent, setAdjacent] = useState(false);
  const [turned, setTurned] = useState(false);
  const [compacted, setCompacted] = useState(proof);
  function changeMode(next) { if (next === adjacent) return; setAdjacent(next); setProof(false); setTurned(false); }
  const step = proof ? 2 : turned ? 1 : 0;
  const n = c.params.n, gap = 22;
  useEffect(() => {
    if (!proof) { setCompacted(false); return; }
    const timer = setTimeout(() => setCompacted(true), 750);
    return () => clearTimeout(timer);
  }, [proof, n, adjacent]);
  const { original, copy, columns } = triangleCopies(n, adjacent);
  // Reserve the rotating square's diagonal, not just its final bounding box.
  const width = Math.max(260, (columns - 1) * gap * Math.SQRT2 + 44);
  const start = (width - (columns - 1) * gap) / 2;
  const secondY = n * gap + 64;
  const copyRows = adjacent ? n - 1 : n;
  const halfCopy = Math.max(0, copyRows - 1) * gap / 2;
  const openHeight = secondY + halfCopy * (1 + Math.SQRT2) + 20;
  const transform = `translate(${proof ? start + (columns - copyRows) * gap : start}px, ${proof ? 26 : secondY}px) rotate(${turned || proof ? 180 : 0}deg)`;
  const captions = ['先數原件與副本：下一步只旋轉藍點，不新增點。', '藍色副本已旋轉 180°，數量不變；預測它能補在哪個空位。', `把旋轉後的副本移進空位，每一行都恰好 ${columns} 點。`];
  return <div className="proof-scene" data-proof="triangular">
    <div className="proof-heading"><h3>兩份點陣，不增不減地重排</h3><p>{adjacent ? '第二份少一排，預測會拼成甚麼。' : '先數兩份是否一樣多，再把藍色那份旋轉 180°。'}</p></div>
    <div className="proof-actions"><button className="proof-action" aria-pressed={!adjacent} onClick={() => changeMode(false)}>兩個 Tₙ → 長方形</button><button className="proof-action" aria-pressed={adjacent} onClick={() => changeMode(true)}>Tₙ + Tₙ₋₁ → 正方形</button></div>
    <p className="proof-reason" role="status">第 {step + 1}／3 步：{captions[step]}{adjacent && n === 1 ? ' 此例 T₀ = 0，藍色副本是空的。' : ''}</p>
    <div className="learning-inline-actions"><button className="proof-action" disabled={step === 0} onClick={() => { if (proof) setProof(false); else setTurned(false); }}>上一步</button><button className="proof-action proof-primary" disabled={step === 2} onClick={() => { if (!turned) setTurned(true); else setProof(true); }}>{step === 0 ? '先旋轉藍色副本' : '再移入空位拼合'}</button></div>
    <div className="proof-triangle-viewport" role="region" aria-label="點陣證明：綠色原件與藍色副本，全圖同時可見">
      <svg key={`${n}:${adjacent}`} className="proof-triangle-svg" viewBox={`0 0 ${width} ${proof && compacted ? n * gap + 32 : openHeight}`} role="img" aria-label={proof ? `${n} 行，每行 ${columns} 點，合共 ${n * columns} 點` : `第一份 ${original.length} 點，第二份 ${copy.length} 點`}>
        {original.map(({ row, col }) => <circle key={`a${row}:${col}`} className="proof-fill-base" cx={start + col * gap} cy={26 + row * gap} r="7"/>)}
        <g className="proof-moving" style={{ transform, transformOrigin: `${(copyRows - 1) * gap / 2}px ${(copyRows - 1) * gap / 2}px` }}>{copy.map(({ row, col }) => <circle key={`b${row}:${col}`} className="proof-fill-copy" cx={col * gap} cy={row * gap} r="7"/>)}</g>
      </svg>
    </div>
    <p className="proof-scale-note">{proof ? `${n} 行 × ${columns} 點；點數與顏色全程不變` : '兩份點陣上下排列，不必左右捲動；每個點都保留。'}圖面隨螢幕縮放，每點仍代表 1。</p>
    {proof && <details className="proof-data"><summary>逐行檢查：為甚麼每行一樣多？</summary><div className="proof-row-counts">{Array.from({ length: n }, (_, row) => <span key={row}>第 {row + 1} 行：{row + 1} + {columns - row - 1} = {columns}</span>)}</div></details>}
    <Legend items={[[ 'base', `T${n}：${original.length} 點` ], [ 'copy', `T${adjacent ? n - 1 : n}：${copy.length} 點（藍色副本）` ]]}/>
    <Equation>{adjacent ? `${original.length} + ${copy.length} = ${n} × ${n} = ${n * n}` : `2 × T${n} = ${n} × ${n + 1} = ${n * (n + 1)}；T${n} = ${c.last}`}</Equation>
    <p className="proof-reason">{adjacent ? '綠色每行 k 點，藍色補 n−k 點，每行都是 n 點。T₀ = 0，故 n=1 也成立。' : '第 k 行有 k 個綠點與 n+1−k 個藍點，每行總是 n+1 點。兩份一樣大，除以 2 才是一份。'}</p>
  </div>;
}

export function ArithmeticProof({ c, selected, setSelected }) {
  const [paired, setPaired] = useState(false);
  const { values, params: p } = c, k = selected ?? p.n - 1;
  const f = proofFormat, pairTotal = c.pairTotal;
  const sum = c.sum;
  const decimal = !Number.isInteger(p.a) || !Number.isInteger(p.d);
  return <div className="proof-scene" data-proof="arithmetic">
    <ArithmeticPicture key={JSON.stringify(p)} c={c}/>
    <h4>數值核對</h4>
    <div className="proof-heading"><h3>倒寫一次，每一對都一樣嗎？</h3><p>先預測首尾和，再用下方按鈕揭開每一對。</p></div>
    <TermPicker values={values} selected={k} onSelect={setSelected} formatValue={f}/>
    <p className="proof-reason">{k === 0 ? '第 1 項是起點，還沒有前一項；這裡不需要 a₀。' : mathNotation(`a${k + 1} − a${k} = d；本次公差 d = ${f(p.d)}`)}</p>
    <button className="proof-action proof-primary" aria-expanded={paired} onClick={() => setPaired(!paired)}>{paired ? '收起配對結果，再預測一次' : '倒寫配對，檢查每對的和'}</button>
    <ComparisonTable label="正寫與倒寫配對表" columns={values.map((_, i) => i + 1)} rows={[
      { label: '正寫 Sₙ', cells: values.map((v, i) => <span className={i === k ? 'source-a' : ''}>{f(v)}</span>) },
      { label: '倒寫 Sₙ', cells: values.map((_, i) => <span className={i === k ? 'source-b' : ''}>{f(values[p.n - i - 1])}</span>) },
      ...(paired ? [{ label: '每對相加', className: 'proof-total-row', cells: values.map(() => f(pairTotal)) }] : []),
    ]}/>
    <Legend items={[[ 'base', '正寫的一份總和' ], [ 'copy', '倒寫的另一份總和' ]]}/>
    <Equation>{paired ? decimal ? `2S${p.n} = ${p.n}(a₁ + a${p.n})；代入目前參數：S${p.n} ≈ ${f(sum)}` : `2S${p.n} = ${p.n} × ${f(pairTotal)} = ${f(c.doubleSum)}；S${p.n} = ${f(sum)}` : `每對會是 a₁ + a${p.n}，共 ${p.n} 對；這是兩份總和`}</Equation>
    <p className="proof-scale-note">顯示值最多保留 10 位有效數字，略去浮點誤差；原始輸入與計算不變。恆等式以符號為準。</p>
    <p className="proof-reason">{p.n === 1 ? '只有一項時，也把同一項寫兩次：2S₁ = 2a₁，再除以 2。' : '即使公差為負或跨過零，倒寫後仍是一增一減、互相抵消；不是把負值當成面積。'}</p>
  </div>;
}

export function GeometricProof({ c }) {
  const [reveal, setReveal] = useState(false);
  const p = c.params, columns = shiftedTerms(c.values, p.r), f = proofFormat;
  return <div className="proof-scene" data-proof="geometric">
    <GeometricPicture key={JSON.stringify(p)} c={c}/>
    <h4>錯位相減數值核對</h4>
    <div className="proof-heading"><h3>乘一次，再把同一項對齊</h3><p>先找兩行相同的位置：相減後，哪些項沒有對手？</p></div>
    <ComparisonTable label="等比數列錯位相減表" corner="次方" columns={columns.map((_, i) => mathNotation(i === 0 ? 'a₁' : `a₁r${i === 1 ? '' : `^${i}`}`))} rows={[
      { label: 'Sₙ', cells: columns.map((v, i) => <span className={reveal && i > 0 && i < p.n ? 'proof-cancel' : 'source-a'}>{i < p.n ? f(v.original) : '—'}</span>) },
      { label: 'rSₙ', cells: columns.map((v, i) => <span className={reveal && i > 0 && i < p.n ? 'proof-cancel' : 'source-b'}>{i > 0 ? f(v.shifted) : '—'}</span>) },
      ...(reveal ? [{ label: '上行 − 下行', className: 'proof-total-row', cells: columns.map(v => f(v.difference)) }] : []),
    ]}/>
    <button className="proof-action proof-primary" aria-expanded={reveal} onClick={() => setReveal(!reveal)}>{reveal ? '還原兩行，重新找可抵消的項' : '相減：劃掉中間相同的項'}</button>
    <Equation>{p.r === 1 ? `r = 1：不能除以 1−r；S${p.n} = ${p.n} × ${f(p.a)} = ${f(c.sum)}` : `(1 − (${f(p.r)})) S${p.n} = ${f(p.a)} − (${f(c.last * p.r)})；S${p.n} = ${f(c.sum)}`}</Equation>
    <p className="proof-reason">{p.a === 0 ? '首項為 0，所有項和部分和都是 0；任何公比都收斂至 0，不必做 0÷0。' : p.r === 0 ? 'r = 0：第一項後全是 0，有限和與無窮和都等於首項。' : Math.abs(p.r) < 1 ? '切到「累積求和」比較部分和與極限。項趨近 0，不等於有限次相加已到達極限。' : '非零首項且 |r|≥1，部分和不收斂；有限和仍然能逐項計算。'}</p>
    <Legend items={[[ 'base', '原來的一行 Sₙ' ], [ 'copy', '每項乘 r，再右移一格' ]]}/>
  </div>;
}

function UnitGroup({ count, first = count, label }) {
  return <div className="proof-unit-group" role="img" aria-label={`${label}，${count} 個單位`}><div className="proof-count-grid">{Array.from({ length: count }, (_, i) => <i key={i} className={i < first ? 'proof-fill-base' : 'proof-fill-copy'}/>)}</div></div>;
}

export function FibonacciProof({ c, selected, setSelected }) {
  const k = selected ?? c.params.n - 1, values = c.values;
  const [joined, setJoined] = useState(false);
  useEffect(() => setJoined(false), [k]);
  return <div className="proof-scene" data-proof="fibonacci">
    <div className="proof-heading"><h3>把兩個來源，真的接成下一項</h3><p>選一項；用下標和顏色同時追蹤來源，不是把上一項翻倍。</p></div>
    <TermPicker values={values} selected={k} onSelect={setSelected} prefix="F" sources/>
    {k < 2 ? <><Equation>F<sub>{k + 1}</sub> = 1（給定的初始條件）</Equation><p className="proof-reason">F₁ = F₂ = 1 是起點，不是由前面兩項算出來的。增加至 3 項後，才能第一次使用遞推規則。</p></> : <>
      <p className="proof-reason" role="status">{joined ? `第 2／2 步：新項保留 ${values[k - 2]} 個綠格和 ${values[k - 1]} 個藍格，沒有額外增加單位。` : '第 1／2 步：先看兩個來源，預測合起來有幾格；不是把藍色那一組翻倍。'}</p>
      <div className="proof-fib-build"><div><h4>來源 A · F<sub>{k - 1}</sub> = {values[k - 2]}</h4><UnitGroup count={values[k - 2]} label={`F${k - 1}`}/></div><b aria-hidden="true">＋</b><div><h4>來源 B · F<sub>{k}</sub> = {values[k - 1]}</h4><UnitGroup count={values[k - 1]} first={0} label={`F${k}`}/></div>{joined && <><b aria-hidden="true">＝</b><div><h4>新項 · F<sub>{k + 1}</sub> = {values[k]}</h4><UnitGroup count={values[k]} first={values[k - 2]} label={`F${k + 1}`}/></div></>}</div>
      <button className="proof-action proof-primary" aria-pressed={joined} onClick={() => setJoined(!joined)}>{joined ? '分回兩個來源，再預測' : '把兩組接起來，檢查預測'}</button>
      {joined && <Equation>F<sub>{k + 1}</sub> = F<sub>{k - 1}</sub> + F<sub>{k}</sub> = {values[k - 2]} + {values[k - 1]} = {values[k]}</Equation>}
    </>}
    <Legend items={[[ 'base', '來源 A：前兩項中的較早一項' ], [ 'copy', '來源 B：緊接的一項' ]]}/>
  </div>;
}

export function AnnuityProof({ c, selected, setSelected }) {
  const p = c.params, k = selected ?? 0, years = p.n - k - 1 + (p.due ? 1 : 0);
  const scale = p.payment > 0 ? 150 / (p.payment * (1 + p.rate / 100) ** 12) : 0;
  const ordinary = p.due ? c.sum / (1 + p.rate / 100) : c.sum;
  return <div className="proof-scene" data-proof="annuity">
    <AnnuityTimeline key={`${p.payment}:${p.rate}:${p.n}:${p.due}`} c={c}/>
    <div className="proof-heading"><h3>每筆錢，都搬到同一個終點 t = {p.n}</h3><p>{p.due ? '期初：存入 t=0、1、…、n−1，每筆多生息一年。' : '期末：存入 t=1、2、…、n，最後一筆尚未生息。'}</p></div>
    <div className="proof-scroll" tabIndex="0" role="region" aria-label="每筆存款的終值，向右捲動查看其餘存款"><div className="proof-deposits">{c.values.map((value, i) => <button className="proof-deposit" key={i} aria-pressed={k === i} onClick={() => setSelected(i)}>
      <strong>${f(value)}</strong><div className="proof-money-track" aria-hidden="true">{value > 0 ? <div className="proof-money-stack" style={{ height: value * scale }}><i className="proof-money-interest" style={{ height: (value - p.payment) * scale }}/><i className="proof-money-principal" style={{ height: p.payment * scale }}/></div> : <span className="proof-zero">0</span>}</div>
      <span>第 {i + 1} 筆 · t={i + (p.due ? 0 : 1)}</span><small>生息 {p.n - i - 1 + (p.due ? 1 : 0)} 年</small>
    </button>)}</div></div>
    <Legend items={[[ 'base', `每筆本金 $${f(p.payment)}` ], [ 'new', '到共同終點的利息' ]]}/>
    <div className="proof-timeline">第 {k + 1} 筆：t = {k + (p.due ? 0 : 1)} 存入 <span aria-hidden="true">→</span> 生息 {years} 年 <span aria-hidden="true">→</span> t = {p.n} 估值</div>
    <Equation>${f(p.payment)} × (1 + {p.rate}%)<sup>{years}</sup> = ${f(c.values[k])}</Equation>
    <p className="proof-reason">本金 ${f(c.principal)} + 利息 ${f(c.sum - c.principal)} = 終值 ${f(c.sum)}。{p.payment === 0 ? '沒有存款，就沒有本金或利息；圖中不畫假長條。' : p.rate === 0 ? '零利率時，期初期末都只得 nP，兩者相同。' : `同一組參數：期末 $${f(ordinary)} × (1 + ${p.rate}%) = 期初 $${f(ordinary * (1 + p.rate / 100))}。`}</p>
    <p className="proof-scale-note">長條共同比例以此本金、利率的 12 年複利為上限；增加存款期數不重設比例。可點選每筆查看完整算式。</p>
  </div>;
}
