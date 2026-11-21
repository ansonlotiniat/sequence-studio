import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Grid2X2, Lightbulb, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { buildChatHistory } from '../chat.js';
import { teaching } from '../learning/content.js';
import { calculatedFacts, contextKey, experimentAction, factLabel, labQuestion, modes,
  parameterNames, parameterValue, snapshotLabel } from './context.js';
import './tutor.css';

async function fetchTutor(payload, signal) {
  const response = await fetch('/api/tutor', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || '暫時無法連接 AI。');
  return data;
}

export default function Tutor({ chatOpen, setChatOpen, lesson, context, practiceCoach, onApplyAction, onLookAtFigure }) {
  const { id, title } = lesson;
  const { page, params } = context;
  const scope = page === 'path' ? 'path' : id;
  const signature = page === 'quiz' ? JSON.stringify([id, page, practiceCoach?.signature]) : contextKey(id, context);
  const label = snapshotLabel(id, context);
  const [threads, setThreads] = useState({});
  const [drafts, setDrafts] = useState({});
  const [modeChoice, setModeChoice] = useState(null);
  const [active, setActive] = useState(null);
  const [pending, setPending] = useState(null);
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachReply, setCoachReply] = useState(null);
  const request = useRef(null);
  const log = useRef(null);
  const thread = threads[scope] ?? [];
  const draft = drafts[scope] ?? '';
  const mode = modeChoice?.scope === scope && (params || modeChoice.mode !== 'experiment') ? modeChoice.mode : 'hint';
  const turn = active?.signature === signature ? active : null;
  const suggestion = pending?.signature === signature ? pending.action : null;
  const facts = calculatedFacts(id, context);
  const fallback = page === 'path' ? '從平方數列開始：觀察邊長加一時，正方形要添多少塊，再試着解釋原因。' : teaching[id].observation;
  const busy = turn && !turn.error;

  useLayoutEffect(() => {
    setPending(null);
    setActive(null);
    setCoachQuestion('');
    setCoachReply(null);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [signature]);

  useLayoutEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [chatOpen, thread, turn, suggestion, practiceCoach?.hintCount, coachReply]);

  const edit = text => setDrafts(current => ({ ...current, [scope]: text }));
  const choose = mode => setModeChoice({ scope, mode });

  async function ask(rawText, responseMode = mode) {
    const text = rawText.trim();
    if (!text || request.current || page === 'quiz') return;
    const controller = new AbortController();
    request.current = controller;
    const user = { role: 'user', text, signature, label, mode: responseMode };
    const messages = buildChatHistory([...thread, user], signature);
    setActive(user);
    setPending(null);
    edit('');
    try {
      const data = await fetchTutor({ lesson: id, context, mode: responseMode, messages }, controller.signal);
      if (typeof data.reply !== 'string') throw new Error('AI 暫時未能回覆。');
      if (request.current !== controller) return;
      const assistant = { role: 'assistant', text: data.reply, signature, label, mode: responseMode };
      setThreads(current => ({ ...current, [scope]: [...(current[scope] ?? []), user, assistant].slice(-40) }));
      setActive(null);
      const action = responseMode === 'experiment' ? experimentAction(data.action, id, params) : null;
      if (action) setPending({ signature, action });
    } catch (error) {
      if (request.current === controller) {
        setActive({ ...user, error: error instanceof TypeError ? '網絡暫時不通。' : error.message });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  async function askCoach(question = coachQuestion) {
    if (!practiceCoach?.input || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setCoachReply({ signature, loading: true });
    try {
      const data = await fetchTutor({ lesson: id, mode: 'quiz', practice: { ...practiceCoach.input, question } }, controller.signal);
      if (request.current !== controller) return;
      if (typeof data.hint !== 'string' || !Number.isInteger(data.hintLevel)) throw new Error('AI 暫時未能選出提示。');
      practiceCoach.onHint(data.hintLevel);
      setCoachReply({ signature, hint: data.hint });
      setCoachQuestion('');
    } catch (error) {
      if (request.current === controller) setCoachReply({ signature, error: error instanceof TypeError ? '網絡暫時不通。' : error.message });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  function clear() {
    request.current?.abort();
    request.current = null;
    setThreads(current => ({ ...current, [scope]: [] }));
    setPending(null);
    setActive(null);
    edit('');
  }

  function apply() {
    if (!suggestion) return;
    onApplyAction(suggestion, context);
    setPending(null);
  }

  return <>
    {!chatOpen && <button className="floating-tutor" onClick={() => setChatOpen(true)}><span><Sparkles size={19}/></span><div>卡住了嗎？問問 AI 學伴<small>陪你想，而不是替你想</small></div><ArrowUpRight size={17}/></button>}
    {chatOpen && <aside className="chat-panel" aria-label="AI 學伴">
      <div className="chat-header">
        <span className="chat-avatar"><Sparkles size={21}/></span>
        <div><strong>序 · AI 學伴</strong><small>{page === 'quiz' ? '找出卡住的一步，不代答' : '先觀察，再說理由'}</small></div>
        <button className="icon-button" aria-label="關閉 AI 學伴" onClick={() => setChatOpen(false)}><X size={20}/></button>
      </div>
      <div className="chat-context"><div><strong>{page === 'path' ? '學習路徑' : title}</strong>{page !== 'path' && <span> · {label}</span>}</div>
        {facts && <details><summary>核對實驗數據（本站計算）</summary><p>{factLabel(id, context, facts)}</p></details>}
        {params && <button type="button" className="outline-button tutor-look-at-figure" aria-controls="experiment-figure"
          onClick={onLookAtFigure}><Grid2X2 size={16} aria-hidden="true"/>回到圖形</button>}
      </div>
      {page === 'quiz' ? <div className="chat-messages tutor-practice" ref={log}>
        <div className="chat-message assistant">
          <span className="message-label">本站練習教練</span>
          {practiceCoach?.finished ? '先用自己的話重述這章的規律，再到下一章應用。' : <>
            <strong>{practiceCoach?.label}</strong>
            <p>{practiceCoach?.resolved ? '已可在練習頁查看完整解法。' : '先在練習寫下你的想法；有需要再開提示。本站會記錄用過的提示，這題不算獨立完成。'}</p>
            {practiceCoach?.hints.length > 0 && <ol>{practiceCoach.hints.map(hint => <li key={hint}>{hint}</li>)}</ol>}
            {practiceCoach?.canHint && <button type="button" className="outline-button" onClick={() => practiceCoach.onHint()}><Lightbulb size={15}/> {practiceCoach.hintCount ? '再給一點提示' : '給我一點提示'}</button>}
          </>}
        </div>
        {practiceCoach?.input && <>
          <form className="tutor-coach-form" onSubmit={e => { e.preventDefault(); askCoach(); }}>
            <label>你是哪一步不確定？（選填）
              <textarea maxLength={500} value={coachQuestion} onChange={e => setCoachQuestion(e.target.value)} placeholder="例如：我把這一項當成了總和…" rows={2}/>
            </label>
            <p>按下按鈕才會把這一題、剛提交的答案及上面的疑問送給 Google。</p>
            <button type="submit" className="outline-button" disabled={coachReply?.loading}>請 AI 幫我找卡住的一步</button>
          </form>
          {coachReply?.signature === signature && <div className={`chat-message assistant${coachReply.error ? ' error' : ''}`} role="status">
            {coachReply.loading ? '正在挑選適合這題的提示…' : coachReply.error ?
              <>{coachReply.error}<p><span className="message-label">本站提示（不是 AI 回覆）</span>{practiceCoach.feedback}</p></> :
              <><span className="message-label">AI 選用的本站提示</span>{coachReply.hint}</>}
          </div>}
        </>}
      </div> : <>
        <div className="chat-messages" ref={log} role="log" aria-label="本章對話" aria-relevant="additions text">
          {!thread.length && !turn && <div className="chat-message assistant">先說你看見甚麼，或試着講出你的理由。我可以給一點提示、核對想法，或和你換一組數字驗證。</div>}
          {[...thread, ...(turn ? [turn] : [])].map((message, i) => <div key={i} className={`chat-message ${message.role}`}>
            <span className="message-label">{message.role === 'assistant' ? `AI · ${modes[message.mode]}` : modes[message.mode]}{message.signature !== signature ? ` · 當時：${message.label}` : ''}</span>
            <div>{message.text}</div>
          </div>)}
          {busy && <div role="status" className="chat-message assistant thinking">正在準備這一輪引導…</div>}
          {turn?.error && <div className="chat-message error">
            <strong>{turn.error}</strong><p><span className="message-label">本站提示（不是 AI 回覆）</span>{fallback}</p>
            <button type="button" className="outline-button" onClick={() => ask(turn.text, turn.mode)}>重試這個問題</button>
          </div>}
          {suggestion && <section className="tutor-suggestion" aria-label="實驗改動預覽">
            <strong>改動預覽 · {title}</strong>
            <ul>{Object.entries(suggestion.params).map(([key, value]) =>
              <li key={key}>{parameterNames[key]}：{parameterValue(key, params[key])} → {parameterValue(key, value)}</li>)}</ul>
            {page === 'learn' && <p>套用後會開啟同一章的實驗室。</p>}
            <div>
              <button type="button" className="apply-action" onClick={apply}>套用建議 <ArrowRight size={15}/></button>
              <button type="button" className="text-button" onClick={() => setPending(null)}>不更改</button>
            </div>
          </section>}
        </div>
        <div className="tutor-mode">
          <label>引導方式 <select value={mode} onChange={e => choose(e.target.value)}>{Object.entries(modes)
            .filter(([key]) => key !== 'experiment' || params).map(([key, caption]) => <option key={key} value={key}>{caption}</option>)}</select></label>
          {Boolean(thread.length || turn) && <button type="button" className="text-button" onClick={clear}>清除對話</button>}
        </div>
        <div className="suggested-questions">
          <button type="button" disabled={busy} onClick={() => { choose('hint'); ask(labQuestion(id, context), 'hint'); }}>從這一步開始</button>
          {params && params.n < 12 && <button type="button" disabled={busy} onClick={() => { choose('experiment'); ask(`請建議只把項數從 ${params.n} 改為 ${params.n + 1}，並給我一個改之前可預測的問題。`, 'experiment'); }}>多一項會怎樣？</button>}
        </div>
        <form className="chat-form" onSubmit={e => { e.preventDefault(); ask(draft); }}>
          <textarea aria-label="向 AI 學伴提問" value={draft} maxLength={1500} rows={2}
            placeholder={mode === 'check' ? '我這樣想：…' : '寫下你看到的規律或卡住的地方…'}
            onChange={e => edit(e.target.value)} onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(draft); }
            }}/>
          <button aria-label="傳送問題" disabled={busy || !draft.trim()}><Send size={18}/></button>
        </form>
      </>}
      <div className="chat-privacy"><ShieldCheck size={12}/> {page === 'quiz' ? '使用本站提示無須連接 AI · 勿輸入個資' :
        '同一設定的近期對話及當前實驗設定由 Google 處理；聊天不寫入學習進度。勿輸入個資或金鑰。AI 可能出錯，請用圖與公式核對。'}</div>
    </aside>}
  </>;
}
