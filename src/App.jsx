import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Layout, { LearningPath } from './Layout.jsx';
import { calculate, defaults, lessons, normalize } from './math.js';
import GuidedLesson from './learning/GuidedLesson.jsx';
import Practice from './learning/Practice.jsx';
import { fromHash, readStudy, recordPractice, startPractice, storageKey } from './learning/progress.js';
import Lab from './visualizations/Lab.jsx';
import Tutor from './tutor/Tutor.jsx';

function atLocation(study, location) {
  const { id, page } = location;
  const chapter = study.chapters[id] ?? {};
  if (page === 'path') return { ...study, location };
  const practice = page === 'quiz' && !chapter.practice ? startPractice(id, study.experiments[id]) : chapter.practice;
  return { ...study, location, chapters: { ...study.chapters, [id]: { ...chapter, explored: true, practice } } };
}

function initialStudy() {
  let study = readStudy();
  try { study = readStudy(window.localStorage); } catch {}
  return atLocation(study, fromHash(window.location.hash) ?? study.location);
}

export default function App() {
  const [study, setStudy] = useState(initialStudy);
  const [chatOpen, setChatOpen] = useState(false);
  const [view, setView] = useState('shape');
  const [proof, setProof] = useState(false);
  const [experimentRun, setExperimentRun] = useState(0);
  const { id, page } = study.location;
  const chapter = study.chapters[id] ?? {};
  const index = lessons.findIndex(l => l.id === id);
  const lesson = lessons[index];
  const nextLesson = lessons[index + 1];
  const c = calculate(id, study.experiments[id] ?? defaults);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(study)); } catch {}
  }, [study]);

  useEffect(() => {
    if (!fromHash(window.location.hash)) {
      const { id, page } = initialStudy().location;
      window.history.replaceState(null, '', `#/${id}/${page}`);
    }
    const onLocationChange = () => {
      setStudy(current => {
        const next = fromHash(window.location.hash);
        if (!next || (next.id === current.location.id && next.page === current.location.page)) return current;
        return atLocation(current, next);
      });
      setProof(false);
      setView('shape');
    };
    window.addEventListener('hashchange', onLocationChange);
    return () => window.removeEventListener('hashchange', onLocationChange);
  }, []);

  function navigate(page, nextId = id) {
    const location = { id: nextId, page };
    if (nextId !== id) { setView('shape'); setProof(false); }
    const hash = `#/${nextId}/${page}`;
    if (window.location.hash !== hash) window.history.pushState(null, '', hash);
    setStudy(current => atLocation(current, location));
    window.scrollTo({ top: 0 });
  }

  const setParams = useCallback(updater => {
    setStudy(current => {
      const previous = current.experiments[id] ?? defaults;
      const params = typeof updater === 'function' ? updater(previous) : updater;
      return { ...current, experiments: { ...current.experiments, [id]: params } };
    });
  }, [id]);

  function preset(next) {
    setParams(normalize(next.params));
    setView(next.view);
    setProof(next.proof ?? false);
    setExperimentRun(n => n + 1);
  }

  function applyAction(action) {
    const target = action.lesson || id;
    if (action.lesson) navigate('lab', target);
    if (action.params) setStudy(current => ({
      ...current,
      experiments: {
        ...current.experiments,
        [target]: normalize({ ...(current.experiments[target] ?? defaults), ...action.params }),
      },
    }));
  }

  function changePractice(practice) {
    setStudy(current => ({
      ...current,
      chapters: { ...current.chapters, [id]: recordPractice(current.chapters[id] ?? {}, practice) },
    }));
  }

  const lab = <Lab key={`${id}:${experimentRun}`} lesson={lesson} c={c} setParams={setParams} view={view} setView={setView} proof={proof} setProof={setProof} />;

  return <Layout {...{ study, lesson, navigate }} openTutor={() => setChatOpen(true)}
    tutor={<Tutor chatOpen={chatOpen} setChatOpen={setChatOpen} lesson={lesson} params={c.params} onApplyAction={applyAction} />}>
    {page === 'path' ? <LearningPath study={study} navigate={navigate} /> : page === 'quiz' ?
      <Practice id={id} practice={chapter.practice} onChange={changePractice} reviewAt={chapter.reviewAt}
        onLab={() => navigate('lab')} onLearn={() => navigate('learn')} hasNext={Boolean(nextLesson)}
        onNextChapter={() => nextLesson ? navigate('learn', nextLesson.id) : navigate('path')}
        onRestart={() => changePractice(startPractice(id, c.params, chapter.practice))} /> : page === 'learn' ?
      <GuidedLesson key={id} id={id} onPreset={preset} onQuiz={() => navigate('quiz')}>{lab}</GuidedLesson> : <>
        {lab}
        <section className="next-step">
          <div><span>從實驗到解釋</span><p>用預測、推導和例題，把觀察寫成自己的理由。</p></div>
          <button className="primary-button" onClick={() => navigate('learn')}>理解與推導 <ArrowRight size={16}/></button>
        </section>
      </>}
  </Layout>;
}
