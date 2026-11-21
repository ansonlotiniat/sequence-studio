import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronRight, CircleHelp, Grid2X2, Lightbulb, Menu, Sparkles, X } from 'lucide-react';
import { lessons } from './math.js';
import { SequenceBasics } from './learning/GuidedLesson.jsx';

const tabs = [
  ['learn', '理解與推導', BookOpen],
  ['lab', '互動實驗室', Grid2X2],
  ['quiz', '小試身手', CircleHelp],
];

export function LearningPath({ study, navigate }) {
  const due = lessons.find(l => study.chapters[l.id]?.reviewAt <= Date.now());
  const unfinished = lessons.find(l => !study.chapters[l.id]?.passedAt);
  const next = due ?? unfinished;
  return <>
    <SequenceBasics />
    {next && <section className="lesson-card path-recommendation">
      <div><span className="eyebrow">NEXT STEP · 建議下一步</span><h2>{due ? `回顧：${next.title}` : `接着學：${next.title}`}</h2></div>
      <button className="primary-button" onClick={() => navigate(due || study.chapters[next.id]?.practice ? 'quiz' : 'learn', next.id)}>繼續學習 <ArrowRight size={16}/></button>
    </section>}
    <section className="path-grid">{lessons.map((lesson, i) => {
      const chapter = study.chapters[lesson.id];
      return <button className="path-card" key={lesson.id} onClick={() => navigate('learn', lesson.id)}>
        <div className="path-card-top"><span>CHAPTER 0{i+1}</span>{chapter?.passedAt ? <CheckCheck size={20}/> : <ArrowUpRight size={16}/>}</div>
        <div className="path-symbol">{lesson.symbol}</div>
        <h2>{lesson.title}</h2><p>{lesson.intro}</p>
        <span className="path-action">{chapter?.passedAt ? '已通過練習' : chapter?.explored ? '已探索 · 繼續學習' : '開始探索'} <ArrowRight size={16}/></span>
      </button>;
    })}</section>
  </>;
}

export default function Layout({ study, lesson, navigate, openTutor, tutor, children }) {
  const [sidebar, setSidebar] = useState(false);
  const { id, page } = study.location;
  const explored = Object.values(study.chapters).filter(chapter => chapter.explored).length;
  const passed = Object.values(study.chapters).filter(chapter => chapter.passedAt).length;
  const go = (page, id) => { navigate(page, id); setSidebar(false); };
  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? 'is-open' : ''}`}>
      <a className="brand" href={`#/${id}/path`} onClick={e=>{e.preventDefault();go('path');}}><img src="./icon.svg" alt=""/><span>序<span className="brand-en">sequence studio</span></span></a>
      <button className="mobile-close icon-button" aria-label="關閉選單" onClick={()=>setSidebar(false)}><X size={20}/></button>
      <div className="course-label">你的數學探索之旅</div>
      <button className={`overview-link ${page === 'path' ? 'active':''}`} onClick={()=>go('path')}><BookOpen size={18}/> 學習路徑 <span className="tiny-pill">{lessons.length}</span></button>
      <div className="nav-label">CHAPTERS <span>學習章節</span></div>
      <nav>{lessons.map((l,i)=><button key={l.id} className={`lesson-nav ${id===l.id && page!=='path'?'active':''}`} onClick={()=>go('learn', l.id)}><span className="lesson-index">0{i+1}</span><span>{l.title}</span>{study.chapters[l.id]?.passedAt?<Check size={15} aria-label="已通過練習"/>:id===l.id?<span className="active-dot"/>:null}</button>)}</nav>
      <div className="sidebar-note"><div className="note-icon"><Lightbulb size={20}/></div><strong>數學，不只在紙上</strong><p>先猜，再用實驗找證據。<br/>最後，用自己的話解釋。</p><span>預測 → 驗證 → 推理</span></div>
      <div className="progress-box"><div><span>通過練習</span><strong>{passed} / {lessons.length}</strong></div><div className="progress-track"><span style={{width:`${passed/lessons.length*100}%`}}/></div><small>已探索 {explored} 章 · 通過須獨立作答</small></div>
      <div className="sidebar-footer"><span className="green-dot"/> 為好奇心而設計 <span>v1.0</span></div>
    </aside>
    {sidebar && <button aria-label="關閉選單遮罩" className="sidebar-overlay" onClick={()=>setSidebar(false)}/>}
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="menu-button icon-button" aria-label="開啟選單" aria-expanded={sidebar} onClick={()=>setSidebar(true)}><Menu size={21}/></button><span>學習空間</span><ChevronRight size={14}/><strong>{page==='path'?'學習路徑':lesson.title}</strong></div><div className="topbar-right"><span className="school-label">中學數學 · 互動探索</span><button className="tutor-top" onClick={openTutor}><Sparkles size={15}/> AI 學伴 <ArrowUpRight size={14}/></button></div></header>
      <main>
        {page !== 'quiz' && <section className="page-heading"><div><div className="eyebrow"><span/> SEE THE PATTERN. FIND THE WONDER.</div><h1>{page==='path'?'每個數列，都有一段故事':'把數學，看明白'}<span className="heading-dot">。</span></h1><p>先猜規律，用圖形驗證，再用數學說明為甚麼。</p></div><div className="heading-illustration" aria-hidden="true"><span>1</span><span>4</span><span>9</span><span>16</span><div className="illustration-line"/><small>patterns are everywhere ↗</small></div></section>}
        {page !== 'path' && <>
          <section className="lesson-heading"><div className="chapter-number">0{lessons.indexOf(lesson)+1}</div><div><div className="lesson-kicker">{lesson.en} <span>·</span> {lesson.tag}</div>{page === 'quiz' ? <h1 className="practice-chapter">{lesson.title}</h1> : <h2>{lesson.title}<span>{lesson.symbol}</span></h2>}</div><div className="lesson-level"><span/> 基礎 → 進階</div></section>
          <nav className="section-tabs" aria-label="章節學習階段">{tabs.map(([target, label, Icon]) => <button key={target} className={page===target?'active':''} aria-current={page===target?'page':undefined} onClick={()=>go(target)}><Icon size={16}/>{label}{target==='quiz' && study.chapters[id]?.passedAt && <Check size={13}/>}</button>)}</nav>
        </>}
        {children}
        <footer className="main-footer"><span>序 · sequence studio <span>把好奇心，變成理解。</span></span><div><button onClick={openTutor}>AI 使用說明</button><span>學習進度只儲存在這部裝置</span></div></footer>
      </main>
    </div>
    {tutor}
  </div>;
}
