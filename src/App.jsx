import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Layout, { LearningPath } from './Layout.jsx';
import { calculate, defaults, lessons, normalize } from './math.js';
import GuidedLesson from './learning/GuidedLesson.jsx';
import Practice from './learning/Practice.jsx';
import { fromHash, practiceItem, readStudy, recordPractice, startPractice, storageKey } from './learning/progress.js';
import Lab from './visualizations/Lab.jsx';
import Tutor from './tutor/Tutor.jsx';
import { contextKey, experimentAction, experimentContext, pickParams } from './tutor/context.js';

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
  const closeTutor = useCallback(() => setChatOpen(false), []);
  const [view, setView] = useState('shape');
  const [proof, setProof] = useState(false);
  const [experimentRun, setExperimentRun] = useState(0);
  const [lessonExperimentOpen, setLessonExperimentOpen] = useState(false);
  const [selection, setSelection] = useState(null);
  const { id, page } = study.location;
  const chapter = study.chapters[id] ?? {};
  const index = lessons.findIndex(l => l.id === id);
  const lesson = lessons[index];
  const nextLesson = lessons[index + 1];
  const c = calculate(id, study.experiments[id] ?? defaults);
  const visibleParams = page === 'lab' || (page === 'learn' && lessonExperimentOpen) ? c.params : null;
  const baseContext = experimentContext(id, page, visibleParams, view, proof);
  const selectionBasis = contextKey(id, baseContext);
  const onSelectionChange = useCallback(term => setSelection(term ? { term, basis: selectionBasis } : null), [selectionBasis]);
  const tutorContext = experimentContext(id, page, visibleParams, view, proof,
    selection?.basis === selectionBasis ? selection.term : null);

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
      setLessonExperimentOpen(false);
    };
    window.addEventListener('hashchange', onLocationChange);
    return () => window.removeEventListener('hashchange', onLocationChange);
  }, []);

  function navigate(page, nextId = id) {
    const location = { id: nextId, page };
    if (nextId !== id) { setView('shape'); setProof(false); }
    if (nextId !== id || page !== study.location.page) setLessonExperimentOpen(false);
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

  function applyAction(action, basis) {
    if (!visibleParams || contextKey(id, tutorContext) !== contextKey(id, basis)) return;
    setStudy(current => {
      const params = normalize(current.experiments[id] ?? defaults);
      if (current.location.id !== id || current.location.page !== page ||
          contextKey(id, experimentContext(id, page, params, view, proof, basis.selected)) !== contextKey(id, basis)) return current;
      const change = experimentAction(action, id, params);
      if (!change) return current;
      return { ...current, experiments: { ...current.experiments, [id]: { ...params, ...change.params } } };
    });
    setSelection(null);
    setExperimentRun(n => n + 1);
    if (page !== 'lab') navigate('lab', id);
    if (!window.matchMedia('(min-width: 1280px)').matches) closeTutor();
  }

  function changePractice(practice) {
    setStudy(current => ({
      ...current,
      chapters: { ...current.chapters, [id]: recordPractice(current.chapters[id] ?? {}, practice) },
    }));
  }

  const practice = page === 'quiz' ? chapter.practice : null;
  const item = practice && !practice.finished ? practiceItem(id, practice) : null;
  const resolved = practice?.feedback?.status === 'correct' || practice?.revealed;
  const practiceCoach = practice && {
    finished: practice.finished,
    label: item?.label,
    resolved,
    hints: item?.hints.slice(0, practice.hintLevel) ?? [],
    hintCount: practice.hintLevel,
    signature: JSON.stringify([item?.id, practice.draft, practice.feedback?.status]),
    feedback: practice.feedback?.status === 'retry' ? practice.feedback.feedback : null,
    input: practice.feedback?.status === 'retry' ? { skill: practice.skill, variant: practice.variants[practice.skill],
      params: pickParams(id, practice.params), attempt: practice.draft, hintLevel: practice.hintLevel } : null,
    canHint: Boolean(item && !resolved && practice.hintLevel < item.hints.length),
    onHint: (level = practice.hintLevel + 1) => setStudy(current => {
      if (current.location.id !== id || current.location.page !== 'quiz') return current;
      const currentChapter = current.chapters[id];
      const active = currentChapter?.practice;
      if (!active || active.finished || active.revealed || active.feedback?.status === 'correct') return current;
      const activeItem = practiceItem(id, active);
      if (activeItem.id !== item?.id || active.draft !== practice.draft) return current;
      const hintLevel = Math.min(Math.max(level, active.hintLevel), activeItem.hints.length);
      if (hintLevel === active.hintLevel) return current;
      const next = recordPractice(currentChapter, { ...active, hintLevel });
      return { ...current, chapters: { ...current.chapters, [id]: next } };
    }),
  };

  const lab = <Lab key={`${id}:${experimentRun}`} lesson={lesson} c={c} setParams={setParams} view={view} setView={setView} proof={proof} setProof={setProof} onSelectionChange={onSelectionChange} />;

  return <Layout {...{ study, lesson, navigate, chatOpen, closeTutor }} openTutor={() => setChatOpen(true)}
    tutor={<Tutor chatOpen={chatOpen} setChatOpen={setChatOpen} lesson={lesson}
      context={tutorContext} practiceCoach={practiceCoach} onApplyAction={applyAction} />}>
    {page === 'path' ? <LearningPath study={study} navigate={navigate} /> : page === 'quiz' ?
      <Practice id={id} practice={chapter.practice} onChange={changePractice} reviewAt={chapter.reviewAt}
        onLab={() => navigate('lab')} onLearn={() => navigate('learn')} hasNext={Boolean(nextLesson)}
        onNextChapter={() => nextLesson ? navigate('learn', nextLesson.id) : navigate('path')}
        onRestart={() => changePractice(startPractice(id, c.params, chapter.practice))} /> : page === 'learn' ?
      <GuidedLesson key={id} id={id} observing={lessonExperimentOpen}
        onOpenExperiment={next => { setLessonExperimentOpen(true); preset(next); }}
        onPreset={preset} onQuiz={() => navigate('quiz')}>{lab}</GuidedLesson> : <>
        {lab}
        <section className="next-step">
          <div><span>從實驗到解釋</span><p>用預測、推導和例題，把觀察寫成自己的理由。</p></div>
          <button className="primary-button" onClick={() => navigate('learn')}>理解與推導 <ArrowRight size={16}/></button>
        </section>
      </>}
  </Layout>;
}
