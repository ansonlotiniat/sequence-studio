import React, { useEffect, useRef, useState } from 'react';
import { Download, Grid2X2, Layers, Lightbulb, LineChart, Minus, Pause, Play, Plus, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { arithmeticPartialSum, calculate, defaults, normalize } from '../math.js';
import { proofCalculation, proofFormat, visualFormat as f } from './proofModels.js';
import { ShapeView, SequenceChart, SumView } from './SequenceViews.jsx';
import './visualizations.css';

export default function Lab({ lesson, c, setParams, view, setView, proof, setProof, onSelectionChange, tutorResume }) {
  const { id } = lesson, p = c.params;
  const display = proofCalculation(id, c), displayFormat = id === 'arithmetic' || id === 'geometric' ? proofFormat : f;
  const [playing, setPlaying] = useState(false);
  const workspaceRef = useRef(null), controlsRef = useRef(null);
  const [speed, setSpeed] = useState(1600);
  const [repeat, setRepeat] = useState(false);
  const [rawSelected, setSelected] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const selected = Number.isInteger(rawSelected) && rawSelected >= 0 && rawSelected < p.n ? rawSelected : null;
  const focused = view === 'graph' ? selected : view === 'sum' ? selected ?? p.n - 1 : ['triangular', 'geometric'].includes(id) ? null : selected ?? (id === 'annuity' ? 0 : p.n - 1);
  const update = (key, value) => { setPlaying(false); setParams(v => normalize({ ...v, [key]: value })); setSelected(null); setAnnouncement(''); };
  const choose = index => { setPlaying(false); setSelected(index); };
  const applyParams = changes => { setPlaying(false); setParams(current => normalize({ ...current, ...changes })); setSelected(null); setAnnouncement('已切換到視覺實驗的示例參數。'); };

  useEffect(() => {
    if (!playing) return;
    if (p.n === 12 && !repeat) { setPlaying(false); setAnnouncement('已到第 12 項。播放已停止，可以回看或重新播放。'); return; }
    const timer = setTimeout(() => setParams(v => normalize({ ...v, n: v.n === 12 ? 1 : v.n + 1 })), speed);
    return () => clearTimeout(timer);
  }, [playing, p.n, speed, repeat, setParams]);
  useEffect(() => { setSelected(null); }, [p.n]);
  useEffect(() => { onSelectionChange?.(focused === null ? null : focused + 1); }, [focused, onSelectionChange]);
  useEffect(() => {
    // Reserve the real control height, including wrapped labels and loaded fonts.
    const observer = new ResizeObserver(() => {
      workspaceRef.current?.style.setProperty('--experiment-controls-height', `${controlsRef.current.getBoundingClientRect().height}px`);
    });
    observer.observe(controlsRef.current);
    return () => observer.disconnect();
  }, []);

  function changeView(next) {
    if (next === view) return;
    setPlaying(false); setSelected(null); setProof(false); setView(next);
  }
  function togglePlayback() {
    if (playing) { setPlaying(false); return; }
    if (p.n === 12) setParams(v => ({ ...v, n: 1 }));
    setSelected(null); setAnnouncement(''); setPlaying(true);
  }
  function reset() { setParams({ ...defaults }); setSelected(null); setPlaying(false); setProof(false); setAnnouncement('已重設此章節的實驗參數。'); }
  function download() {
    const rows = [id === 'annuity' ? `存款順序,第${p.n}年年末終值,同一時點終值小計` : '項數,數值,累積和']; let sum = 0;
    c.values.forEach((value, i) => { sum = id === 'arithmetic' ? arithmeticPartialSum(p.a, p.d, i + 1) : sum + value; rows.push(`${i + 1},${value},${sum}`); });
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${id}-n${p.n}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <div ref={workspaceRef} className="lab-layout lab-visualizations">
    <aside ref={controlsRef} className="controls-panel" onFocusCapture={() => setPlaying(false)}>
      <div className="control-heading"><span>你的實驗，自己決定</span><span className="control-tag">即時更新</span></div><p>一次改一個數字，再用圖形解釋原因。</p>
      <div className="term-control"><label htmlFor="n-range">{id === 'annuity' ? '存款期數' : '觀察項數'} <span>n</span></label><div className="stepper"><button aria-label="減少一項" disabled={p.n === 1} onClick={() => update('n', p.n - 1)}><Minus size={16}/></button><input aria-label="項數" type="number" min="1" max="12" value={p.n} onChange={e => update('n', e.target.value)}/><button aria-label="增加一項" disabled={p.n === 12} onClick={() => update('n', p.n + 1)}><Plus size={16}/></button></div></div>
      <input id="n-range" aria-label="觀察項數滑桿" className="range" type="range" min="1" max="12" value={p.n} onChange={e => update('n', e.target.value)}/><div className="range-labels"><span>1 {id === 'annuity' ? '年' : '項'}</span><span>12 {id === 'annuity' ? '年' : '項'}</span></div>
      {(id === 'arithmetic' || id === 'geometric') && <div className="extra-controls"><NumberControl label="首項 a₁" value={p.a} min={-20} max={20} step={1} onChange={v => update('a', v)}/><NumberControl label={id === 'arithmetic' ? '公差 d' : '公比 r'} value={id === 'arithmetic' ? p.d : p.r} min={id === 'arithmetic' ? -10 : -3} max={id === 'arithmetic' ? 10 : 3} step={0.5} onChange={v => update(id === 'arithmetic' ? 'd' : 'r', v)}/></div>}
      {id === 'annuity' && <div className="extra-controls"><NumberControl label="每年存入 P ($)" value={p.payment} min={0} max={100000} step={100} onChange={v => update('payment', v)}/><NumberControl label="年利率 i (%)" value={p.rate} min={0} max={30} step={0.5} onChange={v => update('rate', v)}/><label className="checkbox-label"><input type="checkbox" checked={p.due} onChange={e => update('due', e.target.checked)}/>每年期初存入</label></div>}
      <div className="experiment-results" role="group" aria-label="目前運算結果" aria-live="polite" aria-atomic="true">
        <div className="stat-box"><span>{id === 'annuity' ? '共同終點總值 FV' : `第 ${p.n} 項`}{id !== 'annuity' && <i>a<sub>{p.n}</sub></i>}</span><strong>{id === 'annuity' ? '$' : ''}{displayFormat(id === 'annuity' ? c.sum : display.last)}</strong></div>
        <div className="sum-stat"><span>{id === 'annuity' ? '利息佔總值' : `前 ${p.n} 項的和`} <i>{id === 'annuity' ? '' : 'Sₙ'}</i></span><strong>{id === 'annuity' ? `${c.sum === 0 ? 0 : f((c.sum - c.principal) / c.sum * 100)}%` : displayFormat(display.sum)}</strong></div>
      </div>
      <details className="experiment-notes"><summary>觀察提示與數值解讀</summary>
      <p>{id === 'square' ? `${p.n} × ${p.n} = ${c.last} 平方單位` : id === 'triangular' ? `第 ${p.n} 個三角形有 ${c.last} 點` : id === 'annuity' ? `本金 $${f(c.principal)} · 利息 $${f(c.sum - c.principal)}` : lesson.formula}</p>
      <div className="observe-note"><Lightbulb size={18}/><div><strong>觀察後，試著解釋</strong><p>{id === 'square' ? '先區分最後一個正方形與全部正方形；切到 L 形，再解釋新增一圈為甚麼有 2n−1 格。' : id === 'triangular' ? '不用重新逐點數，說明每行為甚麼一樣長、何時要除以 2。' : id === 'arithmetic' ? '若公差為負，倒寫配對為甚麼仍然有相同的和？' : id === 'geometric' ? '指出相減時留下的首尾兩項，並解釋 r=1 時不能做哪一步。' : id === 'fibonacci' ? '指出兩個來源的下標，再說明為甚麼不是上一項乘二。' : '指出最後一筆存款的時間，再說明期初比期末多生息多久。'}</p></div></div>
      </details>
    </aside>
    <section id="experiment-figure" tabIndex={-1} className="visual-panel" aria-label={`${lesson.title}視覺化`}>
      {tutorResume}
      <div className="panel-heading"><div><span className="live-indicator"/><strong>{view === 'graph' ? '分清單項、部分和與座標' : view === 'sum' ? '每一項，怎樣組成總和？' : id === 'square' ? '一個正方形，與所有正方形的總和' : lesson.question}</strong></div><button className="icon-button" aria-label="下載目前數列 CSV" title="下載數據 CSV" onClick={download}><Download size={18}/></button></div>
      <div className="view-switch" role="group" aria-label="觀察方式">
        <button aria-pressed={view === 'shape'} className={view === 'shape' ? 'active' : ''} onClick={() => changeView('shape')}><Grid2X2 size={16}/>視覺證明</button>
        <button aria-pressed={view === 'sum'} className={view === 'sum' ? 'active' : ''} onClick={() => changeView('sum')}><Layers size={16}/>累積求和</button>
        <button aria-pressed={view === 'graph'} className={view === 'graph' ? 'active' : ''} onClick={() => changeView('graph')}><LineChart size={16}/>數列圖表</button>
      </div>
      <div className="visual-canvas">{view === 'graph' ? <SequenceChart values={c.values} selected={selected} setSelected={choose} domainValues={calculate(id, { ...p, n: 12 }).values} annuityYear={id === 'annuity' ? p.n : null} allowLog={id === 'geometric'}/> : view === 'sum' ? <SumView id={id} c={display} selected={focused} setSelected={choose} onParams={applyParams}/> : <ShapeView id={id} c={display} proof={proof} setProof={setProof} selected={focused} setSelected={choose} onParams={applyParams}/>}</div>
      <div className="visual-playback" aria-label="逐項觀察控制">
        <div className="visual-playback-buttons"><button aria-label="回到上一項" disabled={p.n === 1} onClick={() => update('n', p.n - 1)}><SkipBack size={18}/></button><button className="visual-play" onClick={togglePlayback} aria-label={playing ? '暫停逐項播放' : p.n === 12 ? '從第一項重新播放' : '播放至第十二項'}>{playing ? <Pause size={18}/> : <Play size={18}/>}<span>{playing ? '暫停' : p.n === 12 ? '重播' : '逐項播放'}</span></button><button aria-label="前進到下一項" disabled={p.n === 12} onClick={() => update('n', p.n + 1)}><SkipForward size={18}/></button><button aria-label="重設實驗" onClick={reset}><RotateCcw size={18}/></button><output className="visual-playback-count">n = {p.n} / 12</output></div>
        <div className="visual-playback-settings"><label>每項停留<select aria-label="每項停留時間" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value="800">0.8 秒</option><option value="1600">1.6 秒</option><option value="3000">3 秒</option></select></label><label><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)}/>循環播放</label><span>預設到 12 項就停，方便說明觀察</span></div>
        {announcement && <p role="status">{announcement}</p>}
      </div>
    </section>
  </div>;
}

function NumberControl({ label, value, onChange, min, max, step }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    if (!draft.trim() || !Number.isFinite(Number(draft))) { setDraft(String(value)); return; }
    const bounded = Math.min(max, Math.max(min, Number(draft)));
    setDraft(String(bounded)); if (bounded !== value) onChange(bounded);
  }
  return <label className="number-control"><span>{label}</span><input type="number" value={draft} min={min} max={max} step={step} title="輸入後按 Enter 或離開欄位套用；Esc 還原" onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDraft(String(value)); }
  }}/></label>;
}
