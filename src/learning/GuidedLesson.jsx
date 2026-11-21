import React, { useState } from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { sequenceBasics, teaching } from './content.js';
import { lessonDepth } from './depth.js';
import WorkedLab from './WorkedLab.jsx';

const { SquareSumLesson } = import.meta.glob('../visualizations/LearningModels.jsx', { eager: true })['../visualizations/LearningModels.jsx'] ?? {};
const stages = [['lesson-ready', '準備'], ['lesson-predict', '實驗'], ['lesson-worked', '演算'],
  ['explanation', '推導'], ['lesson-exit', '回顧']];
const checkIns = {
  square: ['從三層加到四層，總和增加多少？', '16 塊', '7 塊', '這次加的是整層 4×4，不只是外圈。'],
  arithmetic: ['首項不變，公差改成零。首尾配對後，每一欄是甚麼？', '兩倍首項', '一倍首項', '每欄有正寫和倒寫各一份，每份都等於首項。'],
  geometric: ['哪個負公比會讓非零數列的部分和收斂？', '−½', '−1', '−½ 每次把項的絕對值減半；−1 只改符號，部分和來回跳。'],
  triangular: ['接在四層後，多放一個完整五層點陣，要增加幾個點？', '15 點', '5 點', '完整點陣有五排，只有擴建同一個三角形才加 5 點。'],
  fibonacci: ['起點改成 2、3，使用抵消法求和時，最後要減甚麼？', '第二項 3', '固定減 1', '抵消後剩第 n+2 項減第二項；第二項不一定是 1。'],
  annuity: ['假設折現率為正，哪筆 MOP 100 在今天的價值較高？', '今天收到', '一年後收到', '今天收到不折現；一年後收到要除以大於 1 的增長倍數。'],
};

export function SequenceBasics() {
  return <details className="sequence-basics lesson-card">
    <summary>先讀懂數列：位置、項與總和</summary>
    <ol>{sequenceBasics.map(line => <li key={line}>{line}</li>)}</ol>
  </details>;
}

function Step({ step }) {
  if (typeof step === 'string') return step;
  if (Array.isArray(step)) {
    const [left, right, reason] = step;
    return <>
      <div className="equation-scroll derivation-scroll" tabIndex="0" role="region" aria-label="算式，可左右捲動">
        <div className="equation-line"><span>{left}</span><span>＝</span><span>{right}</span></div>
      </div>
      <p className="equation-reason">{reason}</p>
    </>;
  }
  return <figure className="derivation-table">
    <figcaption>{step.label}<span>左右捲動查看各欄</span></figcaption>
    <div className="derivation-scroll" tabIndex="0" role="region" aria-label={`${step.label}，可左右捲動`}>
    <table aria-label={step.label}><tbody>{step.rows.map(([name, ...values]) =>
      <tr key={name}><th scope="row">{name}</th>{values.map((value, i) => <td key={i}>{value}</td>)}</tr>)}
    </tbody></table>
    </div>
  </figure>;
}

export default function GuidedLesson({ id, observing, onOpenExperiment, onPreset, onQuiz, tutorResume, children }) {
  const lesson = teaching[id];
  const depth = lessonDepth[id];
  const [ready, setReady] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [exitOpen, setExitOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [worked, setWorked] = useState(false);
  const [check, setCheck] = useState(null);
  const [squareMission, setSquareMission] = useState(true);
  const [squareCheck, setSquareCheck] = useState(null);
  const [question, options, expected, explanation] = lesson.readiness;
  const [checkQuestion, correct, distractor, checkReason] = checkIns[id];
  const checkOptions = expected === 0 ? [distractor, correct] : [correct, distractor];
  const directSquareMission = id === 'square' && SquareSumLesson && squareMission;
  const completed = [ready === expected, observing && (!directSquareMission || squareCheck?.correct), worked, check === correct, reviewed];
  const completedCount = completed.filter(Boolean).length;
  function showPreset(preset, apply) {
    if (id === 'square') {
      const mission = preset.view === 'sum' && Number(preset.params.n) === 3;
      setSquareMission(mission);
      if (!mission) setSquareCheck(null);
    }
    apply(preset);
  }
  function jump(target) {
    const section = document.getElementById(target);
    section?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: 'start' });
  }
  return <div className="guided-lesson">
    <nav className="lesson-stage-nav" aria-label="本章段落">
      <div className="lesson-stage-links">{stages.map(([target, name], i) =>
        <a key={target} href={`#${target}`} onClick={event => { event.preventDefault(); jump(target); }}>
          {name}{completed[i] && <><span aria-hidden="true"> ✓</span><span className="lesson-sr">（已完成）</span></>}
        </a>)}</div>
      <div className="lesson-stage-progress">
        <progress aria-label="本章完成進度" value={completedCount} max={stages.length} />
        <span>完成 {completedCount}／{stages.length}</span>
      </div>
    </nav>
    <section className="lesson-card" id="lesson-ready" tabIndex={-1}>
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
    <section className="lesson-card" id="lesson-predict" tabIndex={-1}>
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
    <div id="lesson-experiment" tabIndex={-1} role="region" aria-label="數列實驗">{observing && (directSquareMission ? <section className="lesson-card" id="experiment-figure" tabIndex={-1}>
      {tutorResume}
      <SquareSumLesson n={3} onComplete={setSquareCheck} />
      {squareCheck?.correct && <p className="lesson-feedback" role="status">已核對兩種計數。試改成 n=4，看看增加的是一圈還是一整層。</p>}
    </section> : children)}</div>
    <p className="lesson-card"><strong>探索任務：</strong>{depth.mission}</p>
    <WorkedLab id={id} startingParams={lesson.presets[0].params} onWorked={() => setWorked(true)} onShowExperiment={preset => {
      showPreset(preset, onOpenExperiment);
      requestAnimationFrame(() => jump('lesson-experiment'));
    }} />
    <section className="lesson-card" id="explanation" tabIndex={-1}>
      <span className="eyebrow">04 · 推導與例題</span>
      <h3>從看見，到理解</h3>
      {lesson.derivations.map(([title, prompt, steps]) => <details className="derivation" key={title}>
        <summary>{title}</summary>
        <p><strong>先試：</strong>{prompt}</p>
        <ol>{steps.map(step => <li key={step.label ?? (Array.isArray(step) ? step[2] : step)}><Step step={step}/></li>)}</ol>
      </details>)}
      <fieldset className="lesson-options">
        <legend>停一停，試答：{checkQuestion}</legend>
        {checkOptions.map(option => <button type="button" key={option} aria-pressed={check === option} className="outline-button" onClick={() => setCheck(option)}>{option}</button>)}
      </fieldset>
      {check !== null && <p role="status" className="lesson-feedback"><strong>{check === correct ? '答對了。' : '再想一步。'}</strong> {checkReason}</p>}
      <div className="worked-example">
        <div>
          <span className="eyebrow">分步例題</span>
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
      {depth.financeExamples?.map(([title, prompt, steps, mistake]) => <div className="worked-example" key={title}>
        <div>
          <h4>{title}</h4>
          <p>{prompt}</p>
          <details><summary>先猜，再看分步解法</summary>
            <ol>{steps.map(step => <li key={step}>{step}</li>)}</ol>
            <p className="lesson-feedback"><strong>易錯提醒：</strong>{mistake}</p>
          </details>
        </div>
      </div>)}
    </section>
    <section className="lesson-card" id="lesson-exit" tabIndex={-1}>
      <span className="eyebrow">05 · 離開前，用自己的話說</span>
      <h3>不看公式，能解釋嗎？</h3>
      <p><strong>帶走的重點：</strong>{depth.summary}</p>
      <p>{lesson.exit[0]}</p>
      <div className="lesson-actions">
        <button type="button" className="outline-button" aria-expanded={exitOpen} onClick={() => {
          setExitOpen(!exitOpen);
          setReviewed(true);
        }}>{exitOpen ? '收起核對' : '我想好了，核對理由'}</button>
        <button type="button" className="primary-button" onClick={onQuiz}>進入獨立練習 <ArrowRight size={16}/></button>
      </div>
      {exitOpen && <p className="lesson-feedback">{lesson.exit[1]}</p>}
    </section>
  </div>;
}
