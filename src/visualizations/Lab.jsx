import React, { useEffect, useState } from 'react';
import { Download, Grid2X2, Layers, Lightbulb, LineChart, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { defaults, normalize, format as f } from '../math.js';
import { ShapeView, SequenceChart, SumView } from './SequenceViews.jsx';

export default function Lab({ lesson, c, setParams, view, setView, proof, setProof }) {
  const { id } = lesson;
  const p = c.params;
  const [playing, setPlaying] = useState(false);
  const [rawSelected, setSelected] = useState(null);
  const selected = Number.isInteger(rawSelected) && rawSelected >= 0 && rawSelected < p.n ? rawSelected : null;
  const update = (key, value) => { setPlaying(false); setParams(v => normalize({ ...v, [key]: value })); setSelected(null); };
  useEffect(() => { if (!playing) return; const t = setInterval(() => setParams(v => ({...v, n: v.n >= 12 ? 1 : v.n + 1})), 1100); return () => clearInterval(t); }, [playing, setParams]);
  useEffect(() => { setSelected(null); }, [p.n]);
  function download() {
    const rows = ['項數,數值,累積和']; let sum = 0;
    c.values.forEach((value,i) => { sum += value; rows.push(`${i+1},${value},${sum}`); });
    const url = URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\n')], {type:'text/csv;charset=utf-8;'}));
    const a = document.createElement('a'); a.href = url; a.download = `${id}-n${p.n}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return (
        <div className="lab-layout"><section className="visual-panel"><div className="panel-heading"><div><span className="live-indicator"/> <strong>{view==='graph'?'從座標看規律':view==='sum'?'每一項，累積起來':lesson.question}</strong></div><button className="icon-button" aria-label="下載目前數列 CSV" title="下載數據 CSV" onClick={download}><Download size={17}/></button></div><div className="view-switch"><button className={view==='shape'?'active':''} onClick={()=>setView('shape')}><Grid2X2 size={14}/>幾何視角</button><button className={view==='sum'?'active':''} onClick={()=>setView('sum')}><Layers size={14}/>累積求和</button><button className={view==='graph'?'active':''} onClick={()=>setView('graph')}><LineChart size={14}/>數列圖表</button></div>
        {id === 'triangular' && view === 'shape' && <div className="proof-control"><button className="outline-button" type="button" aria-pressed={proof} onClick={() => setProof(!proof)}>{proof ? '還原三角形' : '拼成長方形'} <Layers size={14}/></button></div>}
        <div className="visual-canvas">{view==='graph'?<SequenceChart values={c.values} selected={selected} setSelected={setSelected} annuityYear={id==='annuity'?p.n:null}/>:view==='sum'?<SumView id={id} c={c}/>:<ShapeView id={id} c={c} proof={proof} selected={selected} setSelected={setSelected}/> }</div>
        <div className="canvas-caption"><span><i className="legend-base"/>{id==='square'?'原有的正方形':id==='annuity'?'存入本金':'目前的數列'}</span><span><i className="legend-new"/>{id==='square'?'新加上的一圈':id==='annuity'?'複利增長':'規律的變化'}</span><small>{view==='graph'?'點選圓點查看該項':'點選圖形，仔細看看'}</small></div>
        <div className="playback"><button className="play-button" onClick={()=>setPlaying(!playing)} aria-label={playing?'暫停動畫':'播放數列動畫'}>{playing?<Pause size={14}/>:<Play size={14}/>}</button><span>{playing?'觀察數列生長中':'讓數列動起來'}</span><div className="playback-dots">{Array.from({length:12},(_,i)=><button key={i} aria-label={`顯示 ${i+1} 項`} className={i<p.n?'filled':''} onClick={()=>{setPlaying(false);update('n',i+1);}}/>)}</div><span className="playback-count">n = {p.n}</span><button className="icon-button" aria-label="重設實驗" onClick={()=>{setParams(defaults);setSelected(null);setPlaying(false);setProof(false);}}><RotateCcw size={15}/></button></div>
        </section><aside className="controls-panel"><div className="control-heading"><span>你的實驗，自己決定</span><span className="control-tag">LIVE</span></div><p>改一個數字，看看規律怎樣變。</p><div className="term-control"><label htmlFor="n-range">{id==='annuity'?'存款期數':'觀察項數'} <span>n</span></label><div className="stepper"><button aria-label="減少一項" disabled={p.n===1} onClick={()=>update('n',p.n-1)}><Minus size={14}/></button><input aria-label="項數" type="number" min="1" max="12" value={p.n} onChange={e=>update('n',e.target.value)}/><button aria-label="增加一項" disabled={p.n===12} onClick={()=>update('n',p.n+1)}><Plus size={14}/></button></div></div><input id="n-range" aria-label="觀察項數滑桿" className="range" type="range" min="1" max="12" value={p.n} onChange={e=>update('n',e.target.value)}/><div className="range-labels"><span>1 {id==='annuity'?'年':'項'}</span><span>12 {id==='annuity'?'年':'項'}</span></div>
        {(id==='arithmetic'||id==='geometric')&&<div className="extra-controls"><NumberControl label="首項 a₁" value={p.a} min={-20} max={20} step={1} onChange={v=>update('a',v)}/><NumberControl label={id==='arithmetic'?'公差 d':'公比 r'} value={id==='arithmetic'?p.d:p.r} min={id==='arithmetic'?-10:-3} max={id==='arithmetic'?10:3} step={0.5} onChange={v=>update(id==='arithmetic'?'d':'r',v)}/></div>}
        {id==='annuity'&&<div className="extra-controls"><NumberControl label="每年存入 P ($)" value={p.payment} min={0} max={100000} step={100} onChange={v=>update('payment',v)}/><NumberControl label="年利率 i (%)" value={p.rate} min={0} max={30} step={0.5} onChange={v=>update('rate',v)}/><label className="checkbox-label"><input type="checkbox" checked={p.due} onChange={e=>update('due',e.target.checked)}/> 每年期初存入</label></div>}
        <div className="stat-box"><span>{id==='annuity'?'期末總值 FV':`第 ${p.n} 項`}{id!=='annuity'&&<i>a<sub>{p.n}</sub></i>}</span><strong>{id==='annuity'?'$':''}{f(id==='annuity'?c.sum:c.last)}</strong><small>{id==='square'?`${p.n} × ${p.n} = ${c.last} 個單位方塊`:id==='triangular'?`1 + 2 + ⋯ + ${p.n} 個點`:id==='annuity'?`本金 $${f(c.principal)} · 利息 $${f(c.sum-c.principal)}`:lesson.formula}</small></div><div className="sum-stat"><span>{id==='annuity'?'利息佔總值':`前 ${p.n} 項的和`} <i>{id==='annuity'?'':'Sₙ'}</i></span><strong>{id==='annuity'?`${c.sum===0?0:f((c.sum-c.principal)/c.sum*100)}%`:f(c.sum)}</strong></div>
        <div className="observe-note"><Lightbulb size={17}/><div><strong>試著觀察</strong><p>{id==='square'?(p.n===1?'從 1 塊開始，這就是邊長為 1 的正方形。加上 3 塊，就能拼出下一項。':`從第 ${p.n-1} 項到第 ${p.n} 項，新增的一圈是 L 形。它剛好有 ${2*p.n-1} 塊！`):id==='arithmetic'?`相鄰兩項的差都是 ${f(p.d)}。公差為負，數列就會向下走。`:id==='geometric'?`公比是 ${p.r}。試試 r = 1、0 或負數，觀察圖表如何改變。`:id==='annuity'?(p.due?'期初存入讓每筆錢多生息一年；最後一筆存款也能獲得一年的利息。':'第一筆錢生息最久；最後一筆期末存款，還沒開始生息。'):id==='triangular'?`第 ${p.n} 排有 ${p.n} 點。加上新的一排，就得到下一個三角形數。`:'前兩項是 1、1；從第三項開始，前兩項相加得到下一項。'}</p></div></div>
        </aside></div>
  );
}

function NumberControl({label,value,onChange,min,max,step}) {
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  return <label className="number-control"><span>{label}</span><input type="number" value={draft} min={min} max={max} step={step} onChange={e=>{setDraft(e.target.value);if(e.target.value.trim()&&Number.isFinite(e.target.valueAsNumber))onChange(e.target.valueAsNumber);}} onBlur={()=>{if(!draft.trim())setDraft(String(value));else{const bounded=Math.min(max,Math.max(min,Number(draft)));setDraft(String(bounded));onChange(bounded);}}}/></label>;
}
