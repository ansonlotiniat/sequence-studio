import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, ArrowRight, ArrowLeft, BookOpen, Check, CheckCheck, ChevronRight, CircleHelp, Download, Grid2X2, Layers, Lightbulb, LineChart, Menu, Minus, Pause, Play, Plus, RotateCcw, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { lessons, defaults, normalize, calculate, format as f, makeQuiz } from './math';
import '@fontsource-variable/noto-sans-tc';
import './styles.css';

function readProgress() { try { return JSON.parse(localStorage.getItem('sequence-progress') || '[]').filter(id => lessons.some(l => l.id === id)); } catch { return []; } }

function App() {
  const [id, setId] = useState('square');
  const [params, setParams] = useState(defaults);
  const [view, setView] = useState('shape');
  const [page, setPage] = useState('lab');
  const [playing, setPlaying] = useState(false);
  const [proof, setProof] = useState(false);
  const [rawSelected, setSelected] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [progress, setProgress] = useState(readProgress);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [hint, setHint] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: '你好，我是序的 AI 學伴。你可以問「為甚麼平方數的差是奇數？」，或請我把實驗改成 7 項。我會先給提示，陪你找出規律。' }]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiReady, setApiReady] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const chatEnd = useRef(null);
  const lesson = lessons.find(l => l.id === id);
  const c = calculate(id, params);
  const p = c.params;
  // Derive validity during render: effects run too late to prevent stale-index
  // reads on the first frame after animation wraps from 12 terms to 1.
  const selected = Number.isInteger(rawSelected) && rawSelected < p.n ? rawSelected : null;
  const quiz = makeQuiz(id, p);
  const update = (key, value) => { setParams(v => normalize({ ...v, [key]: value })); setChecked(false); setSelected(null); };
  const switchLesson = next => { setId(next); setPage('lab'); setView('shape'); setProof(false); setSelected(null); setPlaying(false); setChecked(false); setHint(false); setAnswer(''); setSidebar(false); };
  useEffect(() => { fetch('/api/health').then(r => r.ok ? r.json() : null).then(v => setApiReady(v?.ai === true)).catch(() => setApiReady(false)); }, []);
  useEffect(() => { if (!playing) return; const t = setInterval(() => setParams(v => ({...v, n: v.n >= 12 ? 1 : v.n + 1})), 1100); return () => clearInterval(t); }, [playing]);
  useEffect(() => { if (page !== 'lab') setPlaying(false); }, [page]);
  useEffect(() => { setSelected(null); }, [p.n]);
  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:'smooth'}); }, [messages, busy]);
  const complete = () => { const next = [...new Set([...progress, id])]; setProgress(next); try { localStorage.setItem('sequence-progress', JSON.stringify(next)); } catch {} };
  async function ask(text = question) {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: 'user', text: text.trim() }];
    setMessages(next); setQuestion(''); setBusy(true); setPendingAction(null);
    try {
      const response = await fetch('/api/tutor', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:next.filter(m => m.role === 'user' || !m.error).slice(-10), lesson:id, params:p}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '暫時無法連接，請稍後再試。');
      setMessages(v => [...v, {role:'assistant', text:data.reply}]);
      if (data.action) setPendingAction(data.action);
      setApiReady(true);
    } catch (error) { setMessages(v => [...v, {role:'assistant', text:error.message === 'Unexpected token' ? '連接出現問題，請稍後再試。' : (error.message.startsWith('Unexpected') ? 'AI 服務尚未啟用。你仍可使用所有互動實驗、公式與練習。' : error.message), error:true}]); }
    finally { setBusy(false); }
  }
  function applyAction() { setChecked(false); setAnswer(''); setHint(false); setSelected(null); if (pendingAction.lesson) switchLesson(pendingAction.lesson); if (pendingAction.params) setParams(v => normalize({...v,...pendingAction.params})); setPendingAction(null); }
  function download() {
    const rows = ['項數,數值,累積和']; let sum = 0;
    c.values.forEach((value,i) => { sum += value; rows.push(`${i+1},${value},${sum}`); });
    const url = URL.createObjectURL(new Blob(['\uFEFF'+rows.join('\n')], {type:'text/csv;charset=utf-8;'}));
    const a = document.createElement('a'); a.href = url; a.download = `${id}-n${p.n}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? 'is-open' : ''}`}>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('lab');}}><img src="./icon.svg" alt=""/><span>序<span className="brand-en">sequence studio</span></span></a>
      <button className="mobile-close icon-button" aria-label="關閉選單" onClick={()=>setSidebar(false)}><X size={20}/></button>
      <div className="course-label">你的數學探索之旅</div>
      <button className={`overview-link ${page === 'path' ? 'active':''}`} onClick={()=>{setPage('path');setSidebar(false);}}><BookOpen size={18}/> 學習路徑 <span className="tiny-pill">6</span></button>
      <div className="nav-label">CHAPTERS <span>學習章節</span></div>
      <nav>{lessons.map((l,i)=><button key={l.id} className={`lesson-nav ${id===l.id?'active':''}`} onClick={()=>switchLesson(l.id)}><span className="lesson-index">0{i+1}</span><span>{l.title}</span>{progress.includes(l.id)?<Check size={15}/>:id===l.id?<span className="active-dot"/>:null}</button>)}</nav>
      <div className="sidebar-note"><div className="note-icon"><Lightbulb size={20}/></div><strong>數學，不只在紙上</strong><p>動動手，改改數字。<br/>讓抽象的規律，變得看得見。</p><span>探索 → 觀察 → 理解</span></div>
      <div className="progress-box"><div><span>你的探索進度</span><strong>{progress.length} / 6</strong></div><div className="progress-track"><span style={{width:`${progress.length/6*100}%`}}/></div><small>完成小試身手，點亮一個章節</small></div>
      <div className="sidebar-footer"><span className="green-dot"/> 為好奇心而設計 <span>v1.0</span></div>
    </aside>
    {sidebar && <button aria-label="關閉選單遮罩" className="sidebar-overlay" onClick={()=>setSidebar(false)}/>}
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="menu-button icon-button" aria-label="開啟選單" onClick={()=>setSidebar(true)}><Menu size={21}/></button><span>學習空間</span><ChevronRight size={14}/><strong>{page==='path'?'學習路徑':lesson.title}</strong></div><div className="topbar-right"><span className="school-label">中學數學 · 互動探索</span><button className="tutor-top" onClick={()=>setChatOpen(true)}><Sparkles size={15}/> AI 學伴 <ArrowUpRight size={14}/></button></div></header>
      <main>
        <section className="page-heading"><div><div className="eyebrow"><span/> SEE THE PATTERN. FIND THE WONDER.</div><h1>{page==='path'?'每個數列，都有一段故事':'把數學，看明白'}<span className="heading-dot">。</span></h1><p>不只記住公式。從一塊積木、一個圖形開始，親手發現數列的規律。</p></div><div className="heading-illustration" aria-hidden="true"><span>1</span><span>4</span><span>9</span><span>16</span><div className="illustration-line"/><small>patterns are everywhere ↗</small></div></section>
        {page==='path'?<section className="path-grid">{lessons.map((l,i)=><button className="path-card" key={l.id} onClick={()=>switchLesson(l.id)}><div className="path-card-top"><span>CHAPTER 0{i+1}</span>{progress.includes(l.id)?<CheckCheck size={20}/>:<ArrowUpRight size={20}/>}</div><div className="path-symbol">{l.symbol}</div><h2>{l.title}</h2><p>{l.intro}</p><span className="path-action">開始探索 <ArrowRight size={16}/></span></button>)}</section>:<>
        <section className="lesson-heading"><div className="chapter-number">0{lessons.findIndex(l=>l.id===id)+1}</div><div><div className="lesson-kicker">{lesson.en} <span>·</span> {lesson.tag}</div><h2>{lesson.title}<span>{lesson.symbol}</span></h2></div><div className="lesson-level"><span/> 基礎 → 進階</div></section>
        <div className="section-tabs"><button className={page==='lab'?'active':''} onClick={()=>setPage('lab')}><Grid2X2 size={16}/>互動實驗室</button><button className={page==='learn'?'active':''} onClick={()=>setPage('learn')}><BookOpen size={16}/>理解與推導</button><button className={page==='quiz'?'active':''} onClick={()=>setPage('quiz')}><CircleHelp size={16}/>小試身手{progress.includes(id)&&<Check size={13}/>}</button><span>先觀察，再問為甚麼</span></div>
        {page==='quiz'?<section className="quiz-panel"><span className="eyebrow">YOUR TURN · 輪到你了</span><h2>{quiz.question}</h2><p>現在的數列：{c.values.map(f).join('，')}</p><form onSubmit={e=>{e.preventDefault();setChecked(true);if(answer.trim() && Math.abs(Number(answer)-quiz.answer)<0.001)complete();}}><label htmlFor="quiz-answer">你的答案</label><div className="answer-row"><input id="quiz-answer" type="number" step="any" placeholder="輸入數值" value={answer} onChange={e=>{setAnswer(e.target.value);setChecked(false);}} required/><button className="primary-button">檢查答案 <ArrowRight size={16}/></button></div></form>{checked&&<div role="status" className={`quiz-feedback ${Math.abs(Number(answer)-quiz.answer)<0.001?'correct':'incorrect'}`}>{Math.abs(Number(answer)-quiz.answer)<0.001?<><strong>答對了，這個規律被你找到了！</strong><p>{quiz.solution}</p></>:<><strong>再想一步，還差一點。</strong><p>{quiz.hint}</p><button className="text-button" onClick={()=>setHint(true)}>顯示完整解析</button></>}</div>}<button className="hint-button" onClick={()=>setHint(!hint)}><Lightbulb size={16}/>{hint?'收起提示':'給我一點提示'}</button>{hint&&<div className="hint-content">{quiz.hint}<br/>{checked?`${quiz.solution} 答案：${f(quiz.answer)}`:''}</div>}<button className="text-button back-lab" onClick={()=>setPage('lab')}><ArrowLeft size={15}/> 回實驗室驗證</button></section>:<>
        <div className="lab-layout"><section className="visual-panel"><div className="panel-heading"><div><span className="live-indicator"/> <strong>{view==='graph'?'從座標看規律':view==='sum'?'每一項，累積起來':lesson.question}</strong></div><button className="icon-button" aria-label="下載目前數列 CSV" title="下載數據 CSV" onClick={download}><Download size={17}/></button></div><div className="view-switch"><button className={view==='shape'?'active':''} onClick={()=>setView('shape')}><Grid2X2 size={14}/>幾何視角</button><button className={view==='sum'?'active':''} onClick={()=>setView('sum')}><Layers size={14}/>累積求和</button><button className={view==='graph'?'active':''} onClick={()=>setView('graph')}><LineChart size={14}/>數列圖表</button></div>
        <div className="visual-canvas">{view==='graph'?<SequenceChart values={c.values} selected={selected} setSelected={setSelected} cumulative={false}/>:view==='sum'?<SumView id={id} c={c}/>:<ShapeView id={id} c={c} proof={proof} selected={selected} setSelected={setSelected}/> }</div>
        <div className="canvas-caption"><span><i className="legend-base"/>{id==='square'?'原有的正方形':id==='annuity'?'存入本金':'目前的數列'}</span><span><i className="legend-new"/>{id==='square'?'新加上的一圈':id==='annuity'?'複利增長':'規律的變化'}</span><small>{view==='graph'?'點選圓點查看該項':'點選圖形，仔細看看'}</small></div>
        <div className="playback"><button className="play-button" onClick={()=>setPlaying(!playing)} aria-label={playing?'暫停動畫':'播放數列動畫'}>{playing?<Pause size={14}/>:<Play size={14}/>}</button><span>{playing?'觀察數列生長中':'讓數列動起來'}</span><div className="playback-dots">{Array.from({length:12},(_,i)=><button key={i} aria-label={`顯示 ${i+1} 項`} className={i<p.n?'filled':''} onClick={()=>{setPlaying(false);update('n',i+1);}}/>)}</div><span className="playback-count">n = {p.n}</span><button className="icon-button" aria-label="重設實驗" onClick={()=>{setParams(defaults);setSelected(null);setPlaying(false);setProof(false);}}><RotateCcw size={15}/></button></div>
        </section><aside className="controls-panel"><div className="control-heading"><span>你的實驗，自己決定</span><span className="control-tag">LIVE</span></div><p>改一個數字，看看規律怎樣變。</p><div className="term-control"><label htmlFor="n-range">{id==='annuity'?'存款期數':'觀察項數'} <span>n</span></label><div className="stepper"><button aria-label="減少一項" disabled={p.n===1} onClick={()=>update('n',p.n-1)}><Minus size={14}/></button><input aria-label="項數" type="number" min="1" max="12" value={p.n} onChange={e=>update('n',e.target.value)}/><button aria-label="增加一項" disabled={p.n===12} onClick={()=>update('n',p.n+1)}><Plus size={14}/></button></div></div><input id="n-range" aria-label="觀察項數滑桿" className="range" type="range" min="1" max="12" value={p.n} onChange={e=>update('n',e.target.value)}/><div className="range-labels"><span>1 {id==='annuity'?'年':'項'}</span><span>12 {id==='annuity'?'年':'項'}</span></div>
        {(id==='arithmetic'||id==='geometric')&&<div className="extra-controls"><NumberControl label="首項 a₁" value={p.a} min={-20} max={20} step={1} onChange={v=>update('a',v)}/><NumberControl label={id==='arithmetic'?'公差 d':'公比 r'} value={id==='arithmetic'?p.d:p.r} min={id==='arithmetic'?-10:-3} max={id==='arithmetic'?10:3} step={0.5} onChange={v=>update(id==='arithmetic'?'d':'r',v)}/></div>}
        {id==='annuity'&&<div className="extra-controls"><NumberControl label="每年存入 P ($)" value={p.payment} min={0} max={100000} step={100} onChange={v=>update('payment',v)}/><NumberControl label="年利率 i (%)" value={p.rate} min={0} max={30} step={0.5} onChange={v=>update('rate',v)}/><label className="checkbox-label"><input type="checkbox" checked={p.due} onChange={e=>update('due',e.target.checked)}/> 每年期初存入</label></div>}
        <div className="stat-box"><span>{id==='annuity'?'期末總值 FV':`第 ${p.n} 項`}{id!=='annuity'&&<i>a<sub>{p.n}</sub></i>}</span><strong>{id==='annuity'?'$':''}{f(id==='annuity'?c.sum:c.last)}</strong><small>{id==='square'?`${p.n} × ${p.n} = ${c.last} 個單位方塊`:id==='triangular'?`1 + 2 + ⋯ + ${p.n} 個點`:id==='annuity'?`本金 $${f(c.principal)} · 利息 $${f(c.sum-c.principal)}`:lesson.formula}</small></div><div className="sum-stat"><span>{id==='annuity'?'利息佔總值':`前 ${p.n} 項的和`} <i>{id==='annuity'?'':'Sₙ'}</i></span><strong>{id==='annuity'?`${c.sum===0?0:f((c.sum-c.principal)/c.sum*100)}%`:f(c.sum)}</strong></div>
        <div className="observe-note"><Lightbulb size={17}/><div><strong>試著觀察</strong><p>{id==='square'?(p.n===1?'從 1 塊開始，這就是邊長為 1 的正方形。加上 3 塊，就能拼出下一項。':`從第 ${p.n-1} 項到第 ${p.n} 項，新增的一圈是 L 形。它剛好有 ${2*p.n-1} 塊！`):id==='arithmetic'?`相鄰兩項的差都是 ${f(p.d)}。公差為負，數列就會向下走。`:id==='geometric'?`公比是 ${p.r}。試試 r = 1、0 或負數，觀察圖表如何改變。`:id==='annuity'?(p.due?'期初存入讓每筆錢多生息一年；最後一筆存款也能獲得一年的利息。':'第一筆錢生息最久；最後一筆期末存款，還沒開始生息。'):id==='triangular'?`第 ${p.n} 排有 ${p.n} 點。加上新的一排，就得到下一個三角形數。`:'前兩項是 1、1；從第三項開始，前兩項相加得到下一項。'}</p></div></div>
        </aside></div>
        <div className="insight-banner"><span className="insight-spark">✧</span><p>{id==='square'?<>多一圈，就多一個奇數。<strong>1 + 3 + 5 + ⋯ + (2n − 1) = n²</strong></>:id==='triangular'?<>配對、旋轉，公式就在眼前。<strong>1 + 2 + ⋯ + n = n(n + 1) / 2</strong></>:id==='arithmetic'?<>首尾配對，每一對的和都相同。<strong>a₁ + aₙ = a₂ + aₙ₋₁</strong></>:id==='geometric'?<>乘一次公比，再相減，讓中間項消失。<strong>(1 − r)Sₙ = a₁(1 − rⁿ)</strong></>:id==='annuity'?<>同樣的存款，不同的時間，得到不同的力量。<strong>時間，是複利的一部分。</strong></>:<>下一步，來自前兩步。<strong>1, 1, 2, 3, 5, 8, 13…</strong></>}</p><button onClick={()=>{setPage('learn');document.getElementById('explanation')?.scrollIntoView({behavior:'smooth',block:'start'});}}>為甚麼？ <ArrowRight size={15}/></button></div>
        <Explanation id={id} c={c} proof={proof} setProof={setProof} expanded={page==='learn'} setView={setView}/>
        <section className="next-step"><div><span>理解了？來驗證你的發現。</span><p>一道題目，把看見的規律變成自己的知識。</p></div><button className="primary-button" onClick={()=>{setPage('quiz');window.scrollTo({top:0,behavior:'smooth'});}}>小試身手 <ArrowRight size={16}/></button></section>
        </>}
        </>}
        <footer className="main-footer"><span>序 · sequence studio <span>把好奇心，變成理解。</span></span><div><button onClick={()=>{setChatOpen(true);}}>AI 使用說明</button><span>學習進度只儲存在這部裝置</span></div></footer>
      </main>
    </div>
    {!chatOpen&&<button className="floating-tutor" onClick={()=>setChatOpen(true)}><span><Sparkles size={19}/></span><div>卡住了嗎？問問 AI 學伴<small>陪你想，而不是替你想</small></div><ArrowUpRight size={17}/></button>}
    {chatOpen&&<aside className="chat-panel" aria-label="AI 學伴"><div className="chat-header"><span className="chat-avatar"><Sparkles size={21}/></span><div><strong>序 · AI 學伴</strong><small>{apiReady?'Gemini · 連結你的實驗':'互動學習，從一個問題開始'}</small></div><button className="icon-button" aria-label="關閉 AI 學伴" onClick={()=>setChatOpen(false)}><X size={20}/></button></div><div className="chat-context"><span className="green-dot"/> 正在一起看：{lesson.title} · n = {p.n}</div><div className="chat-messages">{apiReady===false&&<div className="service-notice"><ShieldCheck size={17}/><p>AI 尚未連接。網站管理者需在伺服器設定金鑰；請勿在對話輸入 API key。所有數學實驗仍可正常使用。</p></div>}{messages.map((m,i)=><div key={i} className={`chat-message ${m.role} ${m.error?'error':''}`}>{m.role==='assistant'&&<span className="message-label">序的學習提示</span>}<div>{m.text}</div></div>)}{busy&&<div role="status" className="chat-message assistant thinking">正在觀察你的實驗…</div>}{pendingAction&&<button className="apply-action" onClick={applyAction}><Grid2X2 size={16}/>套用 AI 建議的實驗設定 <ArrowRight size={16}/></button>}<div ref={chatEnd}/></div><div className="suggested-questions"><button disabled={busy} onClick={()=>ask('用圖形提示我理解目前這個數列，不要直接給答案')}>給我一個提示</button><button disabled={busy} onClick={()=>ask('請把實驗改成 7 項，並告訴我可以觀察甚麼')}>試試 7 項</button></div><form className="chat-form" onSubmit={e=>{e.preventDefault();ask();}}><textarea aria-label="向 AI 學伴提問" value={question} maxLength={1500} rows={2} placeholder="問一個問題，或請我調整實驗…" onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();ask();}}}/><button aria-label="傳送問題" disabled={busy||!question.trim()}><Send size={18}/></button></form><div className="chat-privacy"><ShieldCheck size={12}/> 金鑰只留在伺服器 · 對話傳送 Google 處理<br/>AI 可能出錯，請用圖形與公式核對；不要輸入個人資料</div></aside>}
  </div>;
}

function NumberControl({label,value,onChange,min,max,step}) {
  const [draft,setDraft]=useState(String(value));
  useEffect(()=>setDraft(String(value)),[value]);
  return <label className="number-control"><span>{label}</span><input type="number" value={draft} min={min} max={max} step={step} onChange={e=>{setDraft(e.target.value);if(e.target.value.trim()&&Number.isFinite(e.target.valueAsNumber))onChange(e.target.valueAsNumber);}} onBlur={()=>{if(!draft.trim())setDraft(String(value));else{const bounded=Math.min(max,Math.max(min,Number(draft)));setDraft(String(bounded));onChange(bounded);}}}/></label>;
}

function ShapeView({id,c,proof,selected,setSelected}) {
  const n=c.params.n;
  if(id==='square') return <div className="squares-scene"><div className="scene-label">一個數字，一個正方形 <span>邊長 × 邊長</span></div><div className={`squares-row ${n>6?'dense':''}`}>{c.values.map((v,i)=><button key={i} className={`square-item ${selected===i?'selected':''}`} onClick={()=>setSelected(i)} aria-label={`第 ${i+1} 項，${v} 個方塊`}><span className="term-index">a<sub>{i+1}</sub></span><div className="square-grid" style={{gridTemplateColumns:`repeat(${i+1},1fr)`,width:`calc(${i+1} * var(--tile-pitch))`}}>{Array.from({length:v},(_,j)=><span style={{animationDelay:`${j*4}ms`}} className={Math.floor(j/(i+1))===i||j%(i+1)===i?'new-tile':'old-tile'} key={j}/>)}</div><strong>{v}</strong><span className="square-dimension">{i+1} × {i+1}</span></button>)}</div><div className="scene-equation">{selected!==null?(selected===0?'1² = 1，數列從這一塊開始':`${selected+1}² = ${c.values[selected]}，比上一項多 ${2*(selected+1)-1} 塊`):<><span>1²</span><b>→</b><span>2²</span><b>→</b><span>3²</span><b>→</b><span>⋯</span><b>→</b><span>n²</span></>}</div></div>;
  if(id==='triangular') return <div className="triangle-scene"><div className="scene-label">每一排，比上一排多一點 <span>{proof?'兩個三角形，拼成 n × (n + 1)':'點一下「拼成長方形」試試看'}</span></div><div className={`triangle-pair ${proof?'paired':''}`}><div className="dot-triangle">{Array.from({length:n},(_,row)=><div key={row}>{Array.from({length:proof?n+1:row+1},(_,col)=><span key={col} className={col>row?'complement-dot':row===n-1?'orange-dot':''}/>)}</div>)}</div></div><div className="scene-equation">{proof?`${n} × ${n+1} ÷ 2 = ${c.last}`:`1 + 2 + ⋯ + ${n} = ${c.last}`}</div></div>;
  if(id==='fibonacci') return <div className="fib-scene"><div className="scene-label">前兩項的和，成為新的一項 <span>F₁ = F₂ = 1</span></div><div className="fib-terms">{c.values.map((v,i)=><button key={i} onClick={()=>setSelected(i)} className={`${i===selected?'selected':''} ${i===n-1?'fib-last':''}`}><span>F<sub>{i+1}</sub></span><strong>{v}</strong><div className="fib-bar" style={{height:`${Math.max(8,v/c.last*100)}px`}}/></button>)}</div><div className="scene-equation">{(selected??n-1)<2?'起始條件：F₁ = F₂ = 1':`${c.values[(selected??n-1)-2]} + ${c.values[(selected??n-1)-1]} = ${c.values[selected??n-1]}`}</div></div>;
  if(id==='annuity') return <div className="annuity-scene"><div className="scene-label">把每一筆存款，帶到時間線的終點 <span>{c.params.due?'每年期初存入':'每年期末存入'} · 每年複利一次</span></div><div className="annuity-bars">{c.values.map((v,i)=><button key={i} onClick={()=>setSelected(i)} className={selected===i?'selected':''}><span className="contribution-total">${f(v)}</span><div className="contribution-bar" style={{height:`${v/(Math.max(...c.values)||1)*140+12}px`}}><span className="interest-part" style={{flex:Math.max(0,v-c.params.payment)}}/><span className="principal-part" style={{flex:c.params.payment||1}}/></div><span>第 {i+1} 年</span><small>生息 {n-i-1+(c.params.due?1:0)} 年</small></button>)}</div><div className="scene-equation">${f(c.principal)} 本金 <b>＋</b> ${f(c.sum-c.principal)} 利息 <b>＝</b> ${f(c.sum)}</div></div>;
  return <div className="pattern-scene"><div className="scene-label">{id==='arithmetic'?'同樣的差距，不一樣的高度':'每一步，都乘上同一個公比'}<span>{id==='arithmetic'?`公差 d = ${c.params.d}`:`公比 r = ${c.params.r}`}</span></div><SequenceChart values={c.values} selected={selected} setSelected={setSelected} bars/><div className="scene-equation">{c.values.slice(0,5).map(f).join('，')}{n>5?'，…':''}<span className="equation-tag">{id==='arithmetic'?`每次 ${c.params.d>=0?'+':''}${c.params.d}`:`每次 × ${c.params.r}`}</span></div></div>;
}

function SequenceChart({values,selected,setSelected,bars=false,cumulative=false}) {
  if (!Number.isInteger(selected) || selected < 0 || selected >= values.length) selected = null;
  const max=Math.max(...values,0), min=Math.min(...values,0), span=max-min||1;
  const left=55,right=635,top=35,bottom=230;
  const y=v=>bottom-(v-min)/span*(bottom-top), x=i=>values.length===1?(left+right)/2:left+i*(right-left)/(values.length-1);
  return <div className="chart-wrap"><svg viewBox="0 0 690 285" role="img" aria-label={cumulative?'累積和圖表，橫軸是項數，縱軸是累積和 Sₖ':'數列圖表，橫軸是項數，縱軸是數值'}><text x="13" y="18" className="axis-title">{cumulative?'Sₖ':'aₙ'}</text>{Array.from({length:5},(_,i)=>{const v=min+i*span/4;return <g key={i}><line x1={left} x2={right+10} y1={y(v)} y2={y(v)} className="gridline"/><text x={left-12} y={y(v)+4} textAnchor="end" className="axis-tick">{f(v)}</text></g>;})}<line x1={left} x2={right+10} y1={y(0)} y2={y(0)} className="zero-line"/>{!bars&&values.length>1&&<polyline points={values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} className="chart-line"/>}{values.map((v,i)=><g key={i} className="chart-point" role="button" tabIndex="0" aria-label={`第 ${i+1} 項 ${f(v)}`} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i);}}}>{bars?<rect x={x(i)-Math.min(18,180/values.length)} y={Math.min(y(v),y(0))} width={Math.min(36,360/values.length)} height={Math.max(2,Math.abs(y(v)-y(0)))} rx="4" className={i===selected?'bar-selected':'chart-bar'}/>:<><circle cx={x(i)} cy={y(v)} r="15" fill="transparent"/><circle cx={x(i)} cy={y(v)} r={i===selected?7:4.5} className={i===selected?'point-selected':'point'}/></>}<text x={x(i)} y={bottom+23} textAnchor="middle" className="axis-tick">{i+1}</text>{(i===selected||(bars&&values.length<8))&&<text x={x(i)} y={y(v)-12} textAnchor="middle" className="chart-value">{f(v)}</text>}</g>)}<text x="659" y={bottom+23} className="axis-title">n</text></svg><div className="chart-detail">{selected===null?'點選任一項，查看它的數值':`第 ${selected+1} 項：${f(values[selected])}`}</div></div>;
}

function SumView({id,c}) {
  const [chosen,setChosen]=useState(null);
  useEffect(()=>setChosen(null),[id,c.params.n]);
  if(id==='square'||id==='triangular') return <div className="sum-scene"><div className="scene-label">{id==='square'?'把每一個正方形，全部加起來':'把每一個三角形數，全部加起來'}<span>注意：前 n 項的和 Sₙ ≠ 第 n 項 aₙ</span></div><div className="sum-shapes">{c.values.map((v,i)=><React.Fragment key={i}>{i>0&&<span className="plus-sign">+</span>}<div><div className={`sum-grid ${id==='triangular'?'triangle-grid':''}`} style={{gridTemplateColumns:`repeat(${i+1}, 1fr)`}}>{Array.from({length:id==='square'?v:(i+1)**2},(_,j)=><span key={j} style={id==='triangular'&&j%(i+1)>Math.floor(j/(i+1))?{visibility:'hidden'}:{}}/>)}</div><span>{v}</span></div></React.Fragment>)}</div><div className="sum-result"><span>S<sub>{c.params.n}</sub> = {c.values.length<=6?c.values.map(f).join(' + '):`${c.values.slice(0,3).map(f).join(' + ')} + ⋯ + ${f(c.last)}`}</span><strong>= {f(c.sum)}</strong></div></div>;
  let total=0;const sums=c.values.map(v=>(total+=v));
  return <div className="sum-chart"><div className="scene-label">逐項相加，看總和如何變化 <span>縱軸為累積和 Sₖ，不是單項 aₖ</span></div><SequenceChart values={sums} selected={chosen} setSelected={setChosen} cumulative/><div className="sum-result"><span>{id==='annuity'?'所有存款在最後一年的終值之和':'前 n 項相加'}</span><strong>{id==='annuity'?'$':''}{f(c.sum)}</strong></div></div>;
}

const explanations = {
  square: [
    ['看見：一圈 L 形積木','邊長從 n − 1 增加到 n，底邊多 n 塊，右邊多 n − 1 塊。新增的一圈共有 2n − 1 塊，是一個奇數。','n² − (n − 1)² = 2n − 1'],
    ['理解：奇數加出正方形','從 1 塊開始，一圈一圈加上 3、5、7……第 n 個奇數加入後，剛好拼成 n × n 的正方形。','1 + 3 + ⋯ + (2n − 1) = n²'],
    ['延伸：一整串正方形的和','1² + 2² + 3² 並不是 3²！它們分別有 1、4、9 塊，加起來是 14。一般的平方和可用右式計算。','1² + 2² + ⋯ + n² = n(n + 1)(2n + 1) / 6'],
  ],
  arithmetic: [
    ['看見：每次走相同距離','公差 d 可以是正數、零或負數。項數每增加 1，數值便改變 d；所以圖上的點排成一直線。','aₙ − aₙ₋₁ = d'],
    ['理解：不是加 n 次','由第一項走到第 n 項，只走了 n − 1 步。把每一步的公差加到首項，便得到通項公式。','aₙ = a₁ + (n − 1)d'],
    ['延伸：首尾配對求和','把數列正寫、倒寫各一遍。每一對的和都是 a₁ + aₙ，一共有 n 對；兩個總和相加後，再除以 2。','2Sₙ = n(a₁ + aₙ)'],
  ],
  geometric: [
    ['看見：乘法的節奏','每一項等於前一項乘公比 r。r 為負數時，正負號交替；r = 0 時，從第二項起都是零。','aₙ = a₁rⁿ⁻¹'],
    ['理解：錯位相減','把 Sₙ 乘以 r，得到 rSₙ。兩式相減，中間項互相抵消，只剩首項與最後的一項。','Sₙ − rSₙ = a₁ − a₁rⁿ'],
    ['延伸：無窮並不一定無限大','只有 |r| < 1 時，rⁿ 才會趨近零，無窮和才收斂。r = 1 要另行處理：每一項都相同，Sₙ = na₁。','|r| < 1 時，S∞ = a₁ / (1 − r)'],
  ],
  triangular: [
    ['看見：一排比一排多一點','第 n 個三角形數，就是 1 + 2 + ⋯ + n。從上一個三角形到下一個，只需加上新的一排。','Tₙ − Tₙ₋₁ = n'],
    ['理解：把另一半補上','複製一個相同的三角形，旋轉後補到旁邊，得到 n 排、每排 n + 1 點的長方形。原三角形佔一半。','Tₙ = n(n + 1) / 2'],
    ['延伸：相鄰兩項拼正方形','把第 n 和第 n − 1 個三角形數加起來，就得到 n²。試把兩個階梯沿著對角線靠在一起。','Tₙ + Tₙ₋₁ = n²'],
  ],
  fibonacci: [
    ['看見：從兩個一開始','這裡採用 F₁ = 1、F₂ = 1 的定義。從第三項起，把前兩項相加。初始條件也是數列定義的一部分。','1, 1, 2, 3, 5, 8, 13, …'],
    ['理解：用遞推建造','遞推關係依靠前面的結果。程式由左到右計算，每項只加一次；總共 n 項，時間複雜度為 O(n)。','Fₙ = Fₙ₋₁ + Fₙ₋₂'],
    ['延伸：總和藏在後兩項','把 Fₖ = Fₖ₊₂ − Fₖ₊₁ 逐項相加，中間項抵消，留下 Fₙ₊₂ − F₂，所以前 n 項的和等於 Fₙ₊₂ − 1。','F₁ + F₂ + ⋯ + Fₙ = Fₙ₊₂ − 1'],
  ],
  annuity: [
    ['看見：每筆存款的時間不同','假設每年存入 P、固定年利率 i、每年複利一次，不計費用、稅項或通脹。期末存款中，第一筆生息 n − 1 年，最後一筆不生息。','各筆終值：P(1 + i)ⁿ⁻¹, …, P'],
    ['理解：年金就是等比求和','把各筆終值反過來看，是首項 P、公比 1 + i 的等比數列。利率需轉成小數，例如 5% = 0.05。i = 0 時直接用 nP。','FV = P[(1 + i)ⁿ − 1] / i'],
    ['延伸：期初存入多生息一年','如果改為每年期初存入，每一筆錢都多生息一年，因此整個終值再乘 (1 + i)。這是數學模型，不是投資收益保證。','FV期初 = FV期末 × (1 + i)'],
  ],
};
function Explanation({id,c,proof,setProof,expanded,setView}) { const items=explanations[id]; return <section id="explanation" className={`explanation ${expanded?'expanded':''}`}><div className="explanation-heading"><h3>從看見，到理解<span>THE IDEA BEHIND IT</span></h3>{id==='triangular'&&<button className="outline-button" onClick={()=>{setProof(!proof);setView('shape');document.querySelector('.visual-panel')?.scrollIntoView({behavior:'smooth',block:'center'});}}>{proof?'還原三角形':'拼成長方形'} <Layers size={14}/></button>}<span className="reading-time">約 3 分鐘，掌握一個觀念</span></div><div className="explanation-grid">{items.map(([title,text,formula],i)=><article key={title}><span className="step-label">0{i+1} <span>{['OBSERVE','UNDERSTAND','GO FURTHER'][i]}</span></span><h4>{title}</h4><p>{text}</p><div className="formula-strip">{formula}</div></article>)}</div>{expanded&&<div className="worked-example"><div><span className="eyebrow">WORKED EXAMPLE · 用你的數字驗證</span><h3>{lessons.find(l=>l.id===id).title}，n = {c.params.n}</h3><p>目前各項：{c.values.map(f).join('，')}</p><p>{id==='annuity'?'所有存款終值相加':`將這 ${c.params.n} 項相加`} = <strong>{f(c.sum)}</strong>。{id==='square'?`注意：第 ${c.params.n} 項是 ${c.last}，不是總和。`:''}</p></div><div className="example-result"><span>{id==='annuity'?'FV':'Sₙ'}</span><strong>{f(c.sum)}</strong><small>由程式逐項計算，不依賴 AI 作答</small></div></div>}</section>; }

createRoot(document.getElementById('root')).render(<App/>);
