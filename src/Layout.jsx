import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCheck, ChevronRight, CircleHelp, Grid2X2, Lightbulb, Menu, Sparkles, X } from 'lucide-react';
import { lessons } from './math.js';
import { SequenceBasics } from './learning/GuidedLesson.jsx';
import { useMedia, useOverlay } from './useOverlay.js';

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
      <div><span className="eyebrow">建議下一步</span><h2>{due ? `回顧：${next.title}` : `接着學：${next.title}`}</h2></div>
      <button className="primary-button" onClick={() => navigate(due || study.chapters[next.id]?.practice ? 'quiz' : 'learn', next.id)}>繼續學習 <ArrowRight size={16}/></button>
    </section>}
    <section className="path-grid">{lessons.map((lesson, i) => {
      const chapter = study.chapters[lesson.id];
      return <button className="path-card" key={lesson.id} onClick={() => navigate('learn', lesson.id)}>
        <div className="path-card-top"><span>第 {i+1} 章</span>{chapter?.passedAt ? <CheckCheck size={20}/> : <ArrowUpRight size={16}/>}</div>
        <div className="path-symbol">{lesson.symbol}</div>
        <h2>{lesson.title}</h2><p>{lesson.intro}</p>
        <span className="path-action">{chapter?.passedAt ? '已通過練習' : chapter?.explored ? '已探索 · 繼續學習' : '開始探索'} <ArrowRight size={16}/></span>
      </button>;
    })}</section>
  </>;
}

export default function Layout({ study, lesson, navigate, openTutor, chatOpen, closeTutor, tutor, children }) {
  const [sidebar, setSidebar] = useState(false);
  const mobile = useMedia('(max-width: 740px)');
  const docked = useMedia('(min-width: 1280px)');
  const sidebarRef = useRef(null);
  const tutorRef = useRef(null);
  const titleRef = useRef(null);
  const firstPage = useRef(true);
  const closeSidebar = useCallback(() => setSidebar(false), []);
  useOverlay(sidebarRef, sidebar && mobile, true, closeSidebar);
  useOverlay(tutorRef, chatOpen, !docked, closeTutor);
  const { id, page } = study.location;
  useEffect(() => {
    document.title = `${page === 'path' ? '學習路徑' : `${lesson.title} · ${tabs.find(tab => tab[0] === page)?.[1] ?? ''}`}｜序 Sequence Studio`;
    if (firstPage.current) { firstPage.current = false; return; }
    window.scrollTo({ top: 0 });
    const frame = requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [id, page, lesson.title]);
  useEffect(() => { if (!mobile) setSidebar(false); }, [mobile]);
  const explored = Object.values(study.chapters).filter(chapter => chapter.explored).length;
  const passed = Object.values(study.chapters).filter(chapter => chapter.passedAt).length;
  const go = (page, id) => { navigate(page, id); setSidebar(false); };
  const askTutor = () => { setSidebar(false); openTutor(); };
  return <div className={`app-shell ${chatOpen ? 'tutor-open' : ''}`}>
    <a className="skip-link" href="#learning-content" onClick={event => {
      // Keep the hash route and experiment state while moving past navigation.
      event.preventDefault();
      const content = document.getElementById('learning-content');
      content?.focus({ preventScroll: true });
      content?.scrollIntoView({ block: 'start' });
    }}>跳到學習內容</a>
    <aside ref={sidebarRef} id="course-navigation" aria-label="課程導覽" role={sidebar && mobile ? 'dialog' : undefined} aria-modal={sidebar && mobile ? true : undefined} inert={(mobile && !sidebar) || (chatOpen && !docked)} className={`sidebar ${sidebar ? 'is-open' : ''}`}>
      <a className="brand" href={`#/${id}/path`} onClick={e=>{e.preventDefault();go('path');}}><img src="./icon.svg" alt=""/><span>序<span className="brand-en">數列學習空間</span></span></a>
      <button className="mobile-close icon-button" aria-label="關閉選單" onClick={()=>setSidebar(false)}><X size={20}/></button>
      <div className="course-label">數列探索課程</div>
      <button className={`overview-link ${page === 'path' ? 'active':''}`} aria-current={page === 'path' ? 'page' : undefined} onClick={()=>go('path')}><BookOpen size={18}/> 學習路徑 <span className="tiny-pill">{lessons.length}</span></button>
      <div className="nav-label">學習章節</div>
      <nav aria-label="學習章節">{lessons.map((l,i)=><button key={l.id} className={`lesson-nav ${id===l.id && page!=='path'?'active':''}`} aria-current={id===l.id && page!=='path'?'page':undefined} onClick={()=>go('learn', l.id)}><span className="lesson-index">0{i+1}</span><span>{l.title}</span>{study.chapters[l.id]?.passedAt?<Check size={15} aria-label="已通過練習"/>:id===l.id && page!=='path'?<span className="active-dot"/>:null}</button>)}</nav>
      <div className="sidebar-note"><div className="note-icon"><Lightbulb size={20}/></div><strong>數學，不只在紙上</strong><p>先猜，再用實驗找證據。<br/>最後，用自己的話解釋。</p><span>預測 → 驗證 → 推理</span></div>
      <div className="progress-box"><div><span>通過練習</span><strong>{passed} / {lessons.length}</strong></div><div className="progress-track"><span style={{width:`${passed/lessons.length*100}%`}}/></div><small>已探索 {explored} 章 · 通過須獨立作答</small></div>
      <div className="sidebar-footer"><span className="green-dot"/> 為好奇心而設計 <span>v1.0</span></div>
    </aside>
    {sidebar && mobile && <div aria-hidden="true" className="sidebar-overlay" onClick={closeSidebar}/>}
    <div className="main-shell" inert={(sidebar && mobile) || (chatOpen && !docked)}>
      <header className="topbar"><div className="breadcrumb"><button className="menu-button icon-button" aria-label="開啟課程選單" aria-controls="course-navigation" aria-expanded={sidebar} onClick={()=>setSidebar(true)}><Menu size={21}/></button><button className="breadcrumb-home" onClick={()=>go('path')}>學習空間</button><ChevronRight size={14}/><strong>{page==='path'?'學習路徑':lesson.title}</strong></div><div className="topbar-right"><span className="school-label">中學數學 · 一步一步，看懂規律</span><button className="tutor-top" aria-expanded={chatOpen} aria-controls="learning-tutor" onClick={askTutor}><Sparkles size={17}/> AI 學伴</button></div></header>
      <main id="learning-content" tabIndex={-1}>
        {page === 'path' && <section className="page-heading path-heading"><div><div className="eyebrow"><span/> 數列探索</div><h1 ref={titleRef} tabIndex={-1}>把規律，看明白<span className="heading-dot">。</span></h1><p>從一個猜想開始。動手驗證，再把發現說清楚。</p><div className="path-meta"><span>6 個主題</span><span>互動圖像 × 分步推導</span><span>按自己的步調學習</span></div></div><div className="heading-illustration" aria-hidden="true"><span>1</span><span>4</span><span>9</span><span>16</span><div className="illustration-line"/><small>從看見，到理解</small></div></section>}
        {page !== 'path' && <>
          <section className="lesson-heading"><div className="chapter-number">0{lessons.indexOf(lesson)+1}</div><div><div className="lesson-kicker">{lesson.tag}</div><h1 ref={titleRef} tabIndex={-1}>{lesson.title}<span>{lesson.symbol}</span></h1></div><div className="lesson-level">第 {lessons.indexOf(lesson)+1} / {lessons.length} 章</div></section>
          <nav className="section-tabs" aria-label="章節學習階段">{tabs.map(([target, label, Icon], i) => <button key={target} className={page===target?'active':''} aria-current={page===target?'page':undefined} onClick={()=>go(target)}><span className="stage-number" aria-hidden="true">0{i+1}</span><Icon size={16}/>{label}{target==='quiz' && study.chapters[id]?.passedAt && <Check size={13}/>}</button>)}</nav>
        </>}
        {children}
        <section className="learning-help"><Lightbulb size={22}/><div><strong>卡住時，先說說你觀察到甚麼</strong><p>學伴會給提示；答案仍由你用圖形與公式驗證。</p></div><button className="outline-button" onClick={askTutor}><Sparkles size={16}/> 問問學伴</button></section>
        <footer className="main-footer"><span>序 · 數列學習空間 <span>把好奇心，變成理解。</span></span><span>學習進度只儲存在這部裝置</span></footer>
      </main>
    </div>
    {chatOpen && !docked && <div className="tutor-backdrop" aria-hidden="true" onClick={closeTutor}/>}
    <div ref={tutorRef} id="learning-tutor" className="tutor-surface" role={chatOpen?'dialog':undefined} aria-label={chatOpen?'AI 學伴':undefined} aria-modal={chatOpen && !docked ? true : undefined} tabIndex={-1}>{tutor}</div>
  </div>;
}
