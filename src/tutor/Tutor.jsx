import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Grid2X2, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { buildChatHistory } from '../chat.js';

export default function Tutor({ chatOpen, setChatOpen, lesson, params: p, onApplyAction }) {
  const id = lesson.id;
  const [messages, setMessages] = useState([{ role: 'assistant', text: '你好，我是序的 AI 學伴。你可以問「為甚麼平方數的差是奇數？」，或請我把實驗改成 7 項。我會先給提示，陪你找出規律。' }]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiReady, setApiReady] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const chatEnd = useRef(null);
  useEffect(() => { fetch('/api/health').then(r => r.ok ? r.json() : null).then(v => setApiReady(v?.ai === true)).catch(() => setApiReady(false)); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:'smooth'}); }, [messages, busy]);
  async function ask(text = question) {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: 'user', text: text.trim() }];
    setMessages(next); setQuestion(''); setBusy(true); setPendingAction(null);
    try {
      const response = await fetch('/api/tutor', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:buildChatHistory(next), lesson:id, params:p}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '暫時無法連接，請稍後再試。');
      setMessages(v => [...v, {role:'assistant', text:data.reply}]);
      if (data.action) setPendingAction(data.action);
      setApiReady(true);
    } catch (error) { setMessages(v => [...v, {role:'assistant', text:error.message === 'Unexpected token' ? '連接出現問題，請稍後再試。' : (error.message.startsWith('Unexpected') ? 'AI 服務尚未啟用。你仍可使用所有互動實驗、公式與練習。' : error.message), error:true}]); }
    finally { setBusy(false); }
  }
  function applyAction() { onApplyAction(pendingAction); setPendingAction(null); }
  return <>
    {!chatOpen&&<button className="floating-tutor" onClick={()=>setChatOpen(true)}><span><Sparkles size={19}/></span><div>卡住了嗎？問問 AI 學伴<small>陪你想，而不是替你想</small></div><ArrowUpRight size={17}/></button>}
    {chatOpen&&<aside className="chat-panel" aria-label="AI 學伴"><div className="chat-header"><span className="chat-avatar"><Sparkles size={21}/></span><div><strong>序 · AI 學伴</strong><small>{apiReady?'Gemini · 連結你的實驗':'互動學習，從一個問題開始'}</small></div><button className="icon-button" aria-label="關閉 AI 學伴" onClick={()=>setChatOpen(false)}><X size={20}/></button></div><div className="chat-context"><span className="green-dot"/> 正在一起看：{lesson.title} · n = {p.n}</div><div className="chat-messages">{apiReady===false&&<div className="service-notice"><ShieldCheck size={17}/><p>AI 尚未連接。網站管理者需在伺服器設定金鑰；請勿在對話輸入 API key。所有數學實驗仍可正常使用。</p></div>}{messages.map((m,i)=><div key={i} className={`chat-message ${m.role} ${m.error?'error':''}`}>{m.role==='assistant'&&<span className="message-label">序的學習提示</span>}<div>{m.text}</div></div>)}{busy&&<div role="status" className="chat-message assistant thinking">正在觀察你的實驗…</div>}{pendingAction&&<button className="apply-action" onClick={applyAction}><Grid2X2 size={16}/>套用 AI 建議的實驗設定 <ArrowRight size={16}/></button>}<div ref={chatEnd}/></div><div className="suggested-questions"><button disabled={busy} onClick={()=>ask('用圖形提示我理解目前這個數列，不要直接給答案')}>給我一個提示</button><button disabled={busy} onClick={()=>ask('請把實驗改成 7 項，並告訴我可以觀察甚麼')}>試試 7 項</button></div><form className="chat-form" onSubmit={e=>{e.preventDefault();ask();}}><textarea aria-label="向 AI 學伴提問" value={question} maxLength={1500} rows={2} placeholder="問一個問題，或請我調整實驗…" onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();ask();}}}/><button aria-label="傳送問題" disabled={busy||!question.trim()}><Send size={18}/></button></form><div className="chat-privacy"><ShieldCheck size={12}/> 金鑰只留在伺服器 · 對話傳送 Google 處理<br/>AI 可能出錯，請用圖形與公式核對；不要輸入個人資料</div></aside>}
  </>;
}
