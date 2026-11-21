import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react';
import { skills } from '../assessment.js';
import { nextPractice, practiceItem, submitPractice } from './progress.js';

export default function Practice({ id, practice, onChange, onLab, onLearn, onNextChapter, onRestart, hasNext, reviewAt }) {
  const item = practiceItem(id, practice);
  const total = skills[id].length;
  const { feedback, draft, hintLevel, revealed, finished } = practice;
  const heading = useRef(null);
  const correct = feedback?.status === 'correct';
  const independent = practice.independent.includes(practice.skill);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [item.id, finished]);

  if (finished) return <section className="quiz-panel practice-panel">
    <span className="eyebrow">REVIEW · 回顧</span>
    <h2 ref={heading} tabIndex="-1">已通過本章練習</h2>
    <p>你已獨立答對 {total} 個學習重點。隔一段時間用另一組數據試一次，比重做同一題更能檢查理解。</p>
    <ul>{skills[id].map(skill => <li key={skill}>{skill}</li>)}</ul>
    {reviewAt && <p>{reviewAt <= Date.now() ? '現在適合做一次回顧。' : `建議 ${new Intl.DateTimeFormat('zh-Hant', { dateStyle: 'medium' }).format(reviewAt)} 後回顧。`}</p>}
    <div className="lesson-actions">
      <button className="outline-button" onClick={onRestart}>用新數據再練一輪</button>
      <button className="primary-button" onClick={onNextChapter}>{hasNext ? '前往下一章' : '返回學習路徑'} <ArrowRight size={16}/></button>
    </div>
  </section>;

  function edit(value) {
    onChange({ ...practice, draft: value, feedback: null });
  }

  return <section className="quiz-panel practice-panel">
    <span className="eyebrow">YOUR TURN · {item.label}</span>
    <p className="practice-progress">已獨立答對 {practice.independent.length} / {total} 個重點</p>
    <h2 ref={heading} tabIndex="-1">{item.prompt}</h2>
    <form noValidate onSubmit={e => { e.preventDefault(); onChange(submitPractice(id, practice)); }}>
      {item.options ? <fieldset className="practice-choices" disabled={correct || revealed}>
        <legend>選出最合理的答案</legend>
        {item.options.map(([option], i) => <label key={option}><input type="radio" name="option" value={i} checked={draft === String(i)} onChange={e => edit(e.target.value)} />{option}</label>)}
      </fieldset> : <>
        <label htmlFor="quiz-answer">你的答案</label>
        <p id="answer-format" className="answer-format">{item.instruction}</p>
        <div className="answer-row"><input id="quiz-answer" type="text" inputMode="text" autoComplete="off" spellCheck={false} maxLength={64} value={draft} onChange={e => edit(e.target.value)} disabled={correct || revealed} aria-describedby="answer-format" aria-invalid={feedback?.status === 'invalid'} />
          <button className="primary-button" disabled={correct || revealed}>檢查答案 <ArrowRight size={16}/></button></div>
      </>}
      {item.options && <button className="primary-button" disabled={correct || revealed}>檢查答案 <ArrowRight size={16}/></button>}
    </form>
    {feedback && <div role="status" className={`quiz-feedback ${correct ? 'correct' : 'incorrect'}`}>
      <strong>{correct ? independent ? '答對了，這次算作獨立作答。' : '答對了。換一道同類題，試試獨立完成。' : feedback.status === 'invalid' ? '答案格式需要調整。' : '再想一步。'}</strong>
      {!correct && <p>{feedback.status === 'invalid' ? (item.options ? '請先選一個答案。' : '請輸入有限數值，例如 −2、4.5、9/2 或 2e-5；分母不能為零。') : feedback.feedback}</p>}
    </div>}
    {hintLevel > 0 && <ol className="hint-content">{item.hints.slice(0, hintLevel).map(hint => <li key={hint}>{hint}</li>)}</ol>}
    {(correct || revealed) && <div className="worked-solution">
      <strong>完整解法</strong>
      <ol>{item.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </div>}
    <div className="lesson-actions practice-actions">
      {!correct && !revealed && hintLevel < item.hints.length && <button className="hint-button" onClick={() => onChange({ ...practice, hintLevel: hintLevel + 1 })}><Lightbulb size={16}/>{hintLevel ? '多給一個提示' : '給我一點提示'}</button>}
      {!correct && !revealed && (practice.attempts > 0 || hintLevel === item.hints.length) && <button className="outline-button" onClick={() => onChange({ ...practice, revealed: true })}>看完整解法</button>}
      {(correct || revealed) && <>
        {!independent && <button className="primary-button" onClick={() => onChange(nextPractice(id, practice, true))}>換數據，同類再試 <ArrowRight size={16}/></button>}
        <button className={independent ? 'primary-button' : 'outline-button'} onClick={() => onChange(nextPractice(id, practice))}>{practice.independent.length === total ? '查看本章回顧' : '下一個重點'} <ArrowRight size={16}/></button>
      </>}
    </div>
    <div className="lesson-actions practice-links">
      <button className="text-button" onClick={onLearn}><ArrowLeft size={15}/> 回到理解與推導</button>
      <button className="text-button" onClick={onLab}>到實驗室驗證</button>
    </div>
  </section>;
}
