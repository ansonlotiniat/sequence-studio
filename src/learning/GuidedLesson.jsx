import React, { useState } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { sequenceBasics, teaching } from './content.js';
import { lessonDepth } from './depth.js';
import WorkedLab from './WorkedLab.jsx';

const { SquareSumLesson } = import.meta.glob('../visualizations/LearningModels.jsx', { eager: true })['../visualizations/LearningModels.jsx'] ?? {};

export function SequenceBasics() {
  return <details className="sequence-basics lesson-card">
    <summary>先讀懂數列：位置、項與總和</summary>
    <ol>{sequenceBasics.map(line => <li key={line}>{line}</li>)}</ol>
  </details>;
}

function Step({ step }) {
  if (typeof step === 'string') return step;
  return <figure className="derivation-table">
    <figcaption>{step.label}<span>左右捲動查看各欄</span></figcaption>
    <div className="derivation-scroll" tabIndex="0" role="region" aria-label={`${step.label}，可左右捲動`}>
    <table aria-label={step.label}><tbody>{step.rows.map(([name, ...values]) =>
      <tr key={name}><th scope="row">{name}</th>{values.map((value, i) => <td key={i}>{value}</td>)}</tr>)}
    </tbody></table>
    </div>
  </figure>;
}

export default function GuidedLesson({ id, observing, onOpenExperiment, onPreset, onQuiz, children }) {
  const lesson = teaching[id];
  const depth = lessonDepth[id];
  const [ready, setReady] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [exitOpen, setExitOpen] = useState(false);
  const [squareMission, setSquareMission] = useState(true);
  const [squareCheck, setSquareCheck] = useState(null);
  const [question, options, expected, explanation] = lesson.readiness;
  const directSquareMission = id === 'square' && SquareSumLesson && squareMission;
  function showPreset(preset, apply) {
    if (id === 'square') {
      const mission = preset.view === 'sum' && Number(preset.params.n) === 3;
      setSquareMission(mission);
      if (!mission) setSquareCheck(null);
    }
    apply(preset);
  }
  return <div className="guided-lesson">
    <section className="lesson-card">
      <span className="eyebrow">01 · 準備好再出發</span>
      <h3>這一章，你會學到甚麼？</h3>
      <ul>{lesson.goals.map(goal => <li key={goal}>{goal}</li>)}</ul>
      <p><strong>先備知識：</strong>{lesson.prerequisite}</p>
      <fieldset className="lesson-options">
        <legend>{question}</legend>
        {options.map((option, i) => <button type="button" key={option} aria-pressed={ready === i} className="outline-button" onClick={() => setReady(i)}>{option}</button>)}
      </fieldset>
      {ready !== null && <p className="lesson-feedback" role="status"><strong>{ready === expected ? '答對了。' : '先補一小步。'}</strong> {explanation}</p>}
    </section>
    {id === 'square' && <SequenceBasics />}
    <section className="lesson-card">
      <span className="eyebrow">02 · 先猜，再試</span>
      <h3>預測後，用實驗找證據</h3>
      <p>{lesson.hook}</p>
      <label className="prediction-label" htmlFor="prediction">{lesson.prediction}</label>
      <textarea id="prediction" rows="2" value={prediction} onChange={e => setPrediction(e.target.value)} placeholder="寫下你的猜想和理由（不評分）" maxLength={500} />
      {!observing && <button type="button" className="primary-button" onClick={() => showPreset(lesson.presets[0], onOpenExperiment)}>打開實驗，核對猜想 <ArrowRight size={16}/></button>}
      {observing && <>
        <p className="lesson-feedback"><Lightbulb size={16} /> {lesson.observation}</p>
        <div className="lesson-actions">{lesson.presets.map(preset => <button type="button" className="outline-button" key={preset.label} onClick={() => showPreset(preset, onPreset)}>{preset.label}</button>)}</div>
      </>}
    </section>
    <div id="lesson-experiment">{observing && (directSquareMission ? <section className="lesson-card">
      <SquareSumLesson n={3} onComplete={setSquareCheck} />
      {squareCheck?.correct && <p className="lesson-feedback" role="status">已核對兩種計數。試改成 n=4，看看增加的是一圈還是一整層。</p>}
    </section> : children)}</div>
    <p className="lesson-card"><strong>探索任務：</strong>{depth.mission}</p>
    <WorkedLab id={id} startingParams={lesson.presets[0].params} onShowExperiment={preset => showPreset(preset, onOpenExperiment)} />
    <section className="lesson-card" id="explanation">
      <span className="eyebrow">03 · 推導與例題</span>
      <h3>從看見，到理解</h3>
      {lesson.derivations.map(([title, prompt, steps]) => <details className="derivation" key={title}>
        <summary>{title}</summary>
        <p><strong>先試：</strong>{prompt}</p>
        <ol>{steps.map(step => <li key={step.label ?? step}><Step step={step}/></li>)}</ol>
      </details>)}
      <div className="worked-example">
        <div>
          <span className="eyebrow">WORKED EXAMPLE · 分步例題</span>
          <h4>{lesson.example[0]}</h4>
          <ol>{lesson.example[1].map(step => <li key={step}>{step}</li>)}</ol>
        </div>
      </div>
      <div className="worked-example">
        <div>
          <span className="eyebrow">先自己試 · 再核對做法</span>
          <h4>{depth.example[0]}</h4>
          <p>{depth.example[1]}</p>
          <details><summary>打開分步解法</summary>
            <ol>{depth.example[2].map(step => <li key={step}>{step}</li>)}</ol>
          </details>
        </div>
      </div>
      <p className="lesson-feedback"><strong>易錯提醒：</strong>{depth.mistake}</p>
    </section>
    <section className="lesson-card">
      <span className="eyebrow">04 · 離開前，用自己的話說</span>
      <h3>不看公式，能解釋嗎？</h3>
      <p><strong>帶走的重點：</strong>{depth.summary}</p>
      <p>{lesson.exit[0]}</p>
      <div className="lesson-actions">
        <button type="button" className="outline-button" aria-expanded={exitOpen} onClick={() => setExitOpen(!exitOpen)}>{exitOpen ? '收起核對' : '我想好了，核對理由'}</button>
        <button type="button" className="primary-button" onClick={onQuiz}>進入獨立練習 <ArrowRight size={16}/></button>
      </div>
      {exitOpen && <p className="lesson-feedback">{lesson.exit[1]}</p>}
    </section>
  </div>;
}
